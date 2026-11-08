<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\OrderPricingService;
use App\Services\StockReservationService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Stripe\StripeClient;

class OrderController extends Controller
{
    public function __construct(
        private readonly OrderPricingService $pricing,
        private readonly StockReservationService $stockReservations
    ) {
    }

    public function index()
    {
        $orders = Auth::user()->orders()
            ->with(['items.product' => function ($query) {
                $query->select('products.id', 'products.name as title', 'products.image');
            }])
            ->latest()
            ->get();

        return response()->json($orders->map(function ($order) {
            return [
                'id' => $order->id,
                'created_at' => $order->created_at,
                'order_total' => (float) $order->order_total,
                'order_total_minor' => $order->totalMinor(),
                'status' => $order->status,
                'currency' => $order->resolvedCurrency(),
                'payment_method' => $order->payment_method,
                'shipping_details' => $order->shipping_details,
                'items' => $order->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                        'price_at_purchase' => (float) $item->price,
                        'price_at_purchase_minor' => $item->priceMinor(),
                        'product' => $item->product ? [
                            'title' => $item->product->title,
                            'image' => $item->product->image,
                        ] : null,
                    ];
                }),
            ];
        }));
    }

    public function show(Order $order)
    {
        if ((string) $order->user_id !== (string) Auth::id()) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        return response()->json([
            'id' => $order->id,
            'order_total' => (float) $order->order_total,
            'order_total_minor' => $order->totalMinor(),
            'currency' => $order->resolvedCurrency(),
            'payment_method' => $order->payment_method,
            'shipping_details' => $order->shipping_details ?? [],
            'status' => $order->status,
        ]);
    }

    public function lookup(string $paymentIntentId)
    {
        $order = Order::where('payment_intent_id', $paymentIntentId)
            ->where('user_id', Auth::id())
            ->first();

        if (! $order) {
            Log::warning('Order lookup failed.', [
                'payment_intent_id' => $paymentIntentId,
                'user_id' => Auth::id(),
            ]);

            return response()->json(['message' => 'Order not found.'], 404);
        }

        return response()->json(['order_id' => $order->id]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'shipping_details' => 'required',
            'payment_method' => 'required|string|in:credit_card_stripe',
            'payment_intent_id' => 'required|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|distinct|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1|max:100',
            'locale' => 'required|string|in:hu,en,de',
            'currency' => 'required|string|in:HUF,EUR,USD,huf,eur,usd',
        ]);

        $shipping = is_string($data['shipping_details'])
            ? json_decode($data['shipping_details'], true)
            : $data['shipping_details'];

        if (! is_array($shipping)) {
            return response()->json(['message' => 'Invalid shipping details.'], 422);
        }

        $currency = strtolower($data['currency']);

        try {
            $calculation = $this->pricing->calculate(
                $data['items'],
                $currency
            );

            $stripe = new StripeClient(config('services.stripe.secret'));
            $paymentIntent = $stripe->paymentIntents->retrieve($data['payment_intent_id']);

            $expectedAmount = $this->pricing->toStripeAmountFromMinor(
                $calculation['total_minor'],
                $currency
            );

            $expectedCartHash = hash('sha256', json_encode($calculation['items']));

            if (
                (string) ($paymentIntent->metadata->user_id ?? '') !== (string) Auth::id() ||
                strtolower($paymentIntent->currency) !== $currency ||
                (int) $paymentIntent->amount !== $expectedAmount ||
                (string) ($paymentIntent->metadata->cart_hash ?? '') !== $expectedCartHash ||
                ! in_array($paymentIntent->status, [
                    'requires_payment_method',
                    'requires_confirmation',
                    'requires_action',
                ], true) ||
                ! empty($paymentIntent->metadata->order_id)
            ) {
                return response()->json([
                    'message' => 'The payment session does not match this order. Please restart checkout.',
                ], 422);
            }

            $order = DB::transaction(function () use ($data, $shipping, $currency, $calculation, $paymentIntent) {
                $order = Order::create([
                    'user_id' => Auth::id(),
                    'order_total' => $calculation['total'],
                    'order_total_minor' => $calculation['total_minor'],
                    'shipping_details' => $shipping,
                    'payment_method' => 'credit_card_stripe',
                    'status' => 'pending_payment',
                    'payment_intent_id' => $paymentIntent->id,
                    'locale' => $data['locale'],
                    'currency' => $currency,
                ]);

                foreach ($calculation['items'] as $item) {
                    $order->items()->create($item);
                }

                $this->stockReservations->reserve($order);

                return $order;
            });

            try {
                $stripe->paymentIntents->update($paymentIntent->id, [
                    'metadata' => [
                        'order_id' => (string) $order->id,
                        'user_id' => (string) Auth::id(),
                        'cart_hash' => $expectedCartHash,
                    ],
                ]);
            } catch (\Throwable $exception) {
                DB::transaction(function () use ($order) {
                    $lockedOrder = Order::whereKey($order->id)
                        ->lockForUpdate()
                        ->first();

                    if ($lockedOrder) {
                        $this->stockReservations->release($lockedOrder);
                        $lockedOrder->items()->delete();
                        $lockedOrder->delete();
                    }
                });

                throw $exception;
            }

            return response()->json([
                'message' => 'Order successfully created.',
                'order_id' => $order->id,
            ], 201);
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (QueryException $exception) {
            $sqlState = (string) ($exception->errorInfo[0] ?? $exception->getCode());
            $message = strtolower($exception->getMessage());

            if (
                in_array($sqlState, ['23000', '23505'], true) &&
                str_contains($message, 'payment_intent_id')
            ) {
                Log::warning('Duplicate PaymentIntent order creation was rejected.', [
                    'payment_intent_id' => $data['payment_intent_id'],
                    'user_id' => Auth::id(),
                ]);

                return response()->json([
                    'message' => 'This payment session has already been used for an order. Please refresh checkout.',
                ], 409);
            }

            Log::error('Order creation database error.', [
                'exception' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'The order could not be created. Please refresh checkout and try again.',
            ], 500);
        } catch (\Throwable $exception) {
            Log::error('Order creation failed.', [
                'exception' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'The order could not be created. Please refresh checkout and try again.',
            ], 500);
        }
    }

    public function finalize(Request $request)
    {
        $data = $request->validate([
            'payment_intent_id' => 'required|string|max:255',
        ]);

        $order = Order::where('payment_intent_id', $data['payment_intent_id'])
            ->where('user_id', Auth::id())
            ->first();

        if (! $order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        try {
            $stripe = new StripeClient(config('services.stripe.secret'));
            $intent = $stripe->paymentIntents->retrieve($data['payment_intent_id']);

            $expectedAmount = $order->totalMinor();

            if (
                $intent->status !== 'succeeded' ||
                (int) $intent->amount !== $expectedAmount ||
                (int) $intent->amount_received !== $expectedAmount ||
                strtolower($intent->currency) !== $order->resolvedCurrency() ||
                (string) ($intent->metadata->user_id ?? '') !== (string) $order->user_id ||
                (string) ($intent->metadata->order_id ?? '') !== (string) $order->id
            ) {
                return response()->json([
                    'message' => 'Stripe has not confirmed this payment for the selected order.',
                ], 409);
            }

            $currentOrder = DB::transaction(function () use ($order, $intent) {
                $lockedOrder = Order::whereKey($order->id)
                    ->where('user_id', Auth::id())
                    ->lockForUpdate()
                    ->firstOrFail();

                if ((string) $lockedOrder->payment_intent_id !== (string) $intent->id) {
                    return null;
                }

                return $lockedOrder;
            });

            if (! $currentOrder) {
                return response()->json([
                    'message' => 'The order payment session has changed. Please refresh your order history.',
                ], 409);
            }

            $webhookPending = in_array($currentOrder->status, ['pending_payment', 'failed'], true);

            return response()->json([
                'message' => $webhookPending
                    ? 'Payment verified. The order status is awaiting Stripe webhook confirmation.'
                    : 'Payment verified.',
                'payment_verified' => true,
                'order_id' => $currentOrder->id,
                'status' => $currentOrder->status,
                'webhook_pending' => $webhookPending,
            ], $webhookPending ? 202 : 200);
        } catch (ModelNotFoundException $exception) {
            return response()->json(['message' => 'Order not found.'], 404);
        } catch (\Throwable $exception) {
            Log::error('Payment finalization verification failed.', [
                'order_id' => $order->id,
                'payment_intent_id' => $data['payment_intent_id'],
                'exception' => $exception->getMessage(),
            ]);

            return response()->json([
                'message' => 'Payment verification is temporarily unavailable.',
            ], 502);
        }
    }

    public function retryPayment(Order $order)
    {
        if ((string) $order->user_id !== (string) Auth::id()) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        try {
            $prepared = DB::transaction(function () use ($order) {
                $lockedOrder = Order::whereKey($order->id)
                    ->where('user_id', Auth::id())
                    ->lockForUpdate()
                    ->firstOrFail();

                if (! in_array($lockedOrder->status, ['failed', 'pending_payment'], true)) {
                    return [
                        'error' => 'This order cannot be retried.',
                        'status' => 400,
                    ];
                }

                try {
                    $this->stockReservations->reserve($lockedOrder);
                } catch (ValidationException $exception) {
                    return [
                        'error' => 'One or more products are no longer available in the requested quantity.',
                        'status' => 409,
                    ];
                }

                $items = $lockedOrder->items()->get();

                return [
                    'order_id' => $lockedOrder->id,
                    'status' => $lockedOrder->status,
                    'payment_intent_id' => $lockedOrder->payment_intent_id,
                    'currency' => $lockedOrder->resolvedCurrency(),
                    'total_minor' => $lockedOrder->totalMinor(),
                    'attempt' => (int) $lockedOrder->payment_attempts,
                    'cart_hash' => hash('sha256', json_encode($items->map(fn ($item) => [
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                        'price_minor' => $item->priceMinor(),
                    ])->values()->all())),
                ];
            }, 3);

            if (isset($prepared['error'])) {
                return response()->json([
                    'message' => $prepared['error'],
                ], $prepared['status']);
            }

            $stripe = new StripeClient(config('services.stripe.secret'));
            $existingIntent = null;

            if ($prepared['payment_intent_id']) {
                $existingIntent = $stripe->paymentIntents->retrieve(
                    $prepared['payment_intent_id']
                );

                if ($existingIntent->status === 'succeeded') {
                    return response()->json([
                        'message' => 'This order has already been paid. Please refresh your order history.',
                    ], 409);
                }

                if ($existingIntent->status === 'processing') {
                    return response()->json([
                        'message' => 'The previous payment is still processing. Please wait before retrying.',
                    ], 409);
                }

                $retryableStatuses = [
                    'requires_payment_method',
                    'requires_confirmation',
                    'requires_action',
                ];

                if (in_array($existingIntent->status, $retryableStatuses, true)) {
                    $reusedAttempt = DB::transaction(function () use ($prepared, $existingIntent) {
                        $lockedOrder = Order::whereKey($prepared['order_id'])
                            ->where('user_id', Auth::id())
                            ->lockForUpdate()
                            ->firstOrFail();

                        if (
                            ! in_array($lockedOrder->status, ['failed', 'pending_payment'], true) ||
                            (string) $lockedOrder->payment_intent_id !== (string) $existingIntent->id
                        ) {
                            return null;
                        }

                        if ($lockedOrder->status === 'failed') {
                            $lockedOrder->payment_attempts++;
                            $lockedOrder->status = 'pending_payment';
                            $lockedOrder->save();
                        }

                        return (int) $lockedOrder->payment_attempts;
                    }, 3);

                    if ($reusedAttempt === null) {
                        return response()->json([
                            'message' => 'The order payment session has changed. Please refresh your order history.',
                        ], 409);
                    }

                    return response()->json([
                        'success' => true,
                        'order_id' => $prepared['order_id'],
                        'client_secret' => $existingIntent->client_secret,
                        'payment_intent_id' => $existingIntent->id,
                        'payment_attempt' => $reusedAttempt,
                        'reused' => true,
                    ]);
                }

                if ($existingIntent->status !== 'canceled') {
                    return response()->json([
                        'message' => 'The previous payment session cannot safely be replaced. Please contact support.',
                    ], 409);
                }
            }

            $currency = $prepared['currency'];
            $amount = $prepared['total_minor'];

            if ($amount < $this->pricing->minimumStripeAmount($currency)) {
                return response()->json([
                    'message' => 'The amount is below Stripe’s minimum.',
                ], 400);
            }

            $nextAttempt = $prepared['attempt'] + 1;

            $intent = $stripe->paymentIntents->create([
                'amount' => $amount,
                'currency' => $currency,
                'payment_method_types' => ['card'],
                'metadata' => [
                    'order_id' => (string) $prepared['order_id'],
                    'user_id' => (string) Auth::id(),
                    'cart_hash' => $prepared['cart_hash'],
                ],
            ], [
                'idempotency_key' => sprintf(
                    'order-%s-payment-attempt-%d',
                    $prepared['order_id'],
                    $nextAttempt
                ),
            ]);

            $applied = DB::transaction(function () use ($prepared, $intent, $nextAttempt) {
                $lockedOrder = Order::whereKey($prepared['order_id'])
                    ->where('user_id', Auth::id())
                    ->lockForUpdate()
                    ->firstOrFail();

                if (! in_array($lockedOrder->status, ['failed', 'pending_payment'], true)) {
                    return false;
                }

                if (
                    (string) $lockedOrder->payment_intent_id !==
                    (string) ($prepared['payment_intent_id'] ?? '')
                ) {
                    return false;
                }

                if ((int) $lockedOrder->payment_attempts >= $nextAttempt) {
                    return (string) $lockedOrder->payment_intent_id === (string) $intent->id;
                }

                $lockedOrder->payment_attempts = $nextAttempt;
                $lockedOrder->payment_intent_id = $intent->id;
                $lockedOrder->status = 'pending_payment';
                $lockedOrder->save();

                return true;
            }, 3);

            if (! $applied) {
                return response()->json([
                    'message' => 'The order payment session has changed. Please refresh your order history.',
                ], 409);
            }

            return response()->json([
                'success' => true,
                'order_id' => $prepared['order_id'],
                'client_secret' => $intent->client_secret,
                'payment_intent_id' => $intent->id,
                'payment_attempt' => $nextAttempt,
                'reused' => false,
            ]);
        } catch (ModelNotFoundException $exception) {
            return response()->json(['message' => 'Order not found.'], 404);
        } catch (\Throwable $exception) {
            Log::error('Retry payment failed.', [
                'order_id' => $order->id,
                'exception' => $exception->getMessage(),
            ]);

            return response()->json(['message' => 'Payment retry is temporarily unavailable.'], 502);
        }
    }

    public function requestRefund($orderId)
    {
        try {
            $prepared = DB::transaction(function () use ($orderId) {
                $order = Order::where('id', $orderId)
                    ->where('user_id', Auth::id())
                    ->lockForUpdate()
                    ->firstOrFail();

                if (! $order->payment_intent_id) {
                    return [
                        'error' => 'This order has no card payment transaction ID.',
                        'status' => 400,
                    ];
                }

                if ($order->status === 'refunded') {
                    return [
                        'message' => 'This order has already been refunded.',
                        'status' => 200,
                    ];
                }

                if (! in_array($order->status, ['processing', 'completed', 'refund_pending'], true)) {
                    return [
                        'error' => 'Only orders in processing or completed status can be refunded.',
                        'status' => 400,
                    ];
                }

                $previousStatus = $order->status;

                if ($order->status !== 'refund_pending') {
                    $order->status = 'refund_pending';
                    $order->save();
                }

                return [
                    'order_id' => $order->id,
                    'payment_intent_id' => $order->payment_intent_id,
                    'previous_status' => $previousStatus,
                ];
            }, 3);

            if (isset($prepared['error'])) {
                return response()->json([
                    'message' => $prepared['error'],
                ], $prepared['status']);
            }

            if (isset($prepared['status'])) {
                return response()->json([
                    'message' => $prepared['message'],
                    'already_refunded' => true,
                ], $prepared['status']);
            }

            try {
                $stripe = new StripeClient(config('services.stripe.secret'));
                $refund = $stripe->refunds->create([
                    'payment_intent' => $prepared['payment_intent_id'],
                ], [
                    'idempotency_key' => sprintf('order-%s-full-refund', $prepared['order_id']),
                ]);
            } catch (\Throwable $exception) {
                DB::transaction(function () use ($prepared) {
                    $order = Order::whereKey($prepared['order_id'])
                        ->lockForUpdate()
                        ->first();

                    if (
                        $order &&
                        $order->status === 'refund_pending' &&
                        $prepared['previous_status'] !== 'refund_pending'
                    ) {
                        $order->status = $prepared['previous_status'];
                        $order->save();
                    }
                });

                throw $exception;
            }

            return response()->json([
                'message' => 'Refund request submitted. The order will be marked refunded after Stripe confirms it.',
                'refund_id' => $refund->id,
            ], 202);
        } catch (ModelNotFoundException $exception) {
            return response()->json(['message' => 'Order not found.'], 404);
        } catch (\Throwable $exception) {
            Log::error('Refund failed.', [
                'order_id' => $orderId,
                'exception' => $exception->getMessage(),
            ]);

            return response()->json(['message' => 'The refund request could not be submitted.'], 502);
        }
    }
}