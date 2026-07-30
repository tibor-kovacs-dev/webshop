<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\InvalidRequestException;
use Stripe\PaymentIntent;
use Stripe\Stripe;
use Stripe\StripeClient;

class OrderController extends Controller
{
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
        if ($order->user_id !== Auth::id()) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        return response()->json([
            'order_total' => (float) $order->order_total,
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

        if (!$order) {
            Log::warning("Lookup failed for PI: {$paymentIntentId} by User: " . Auth::id());
            return response()->json(['message' => 'Order not found.'], 404);
        }

        return response()->json(['order_id' => $order->id]);
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'order_total' => 'required|numeric|min:0',
            'shipping_details' => 'required|string',
            'payment_method' => 'required|string',
            'status' => 'required|string',
            'payment_intent_id' => 'required|string|max:255',
            'items' => 'required|array',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price_at_purchase' => 'required|numeric|min:0',
            'locale' => 'required|string|in:hu,en,de',
            'currency' => 'nullable|string|in:HUF,EUR,huf,eur',
        ]);

        try {
            DB::beginTransaction();

            $finalTotal = (float) $validatedData['order_total'];

            $order = Order::create([
                'user_id' => auth()->id(),
                'order_total' => $finalTotal,
                'shipping_details' => $validatedData['shipping_details'],
                'payment_method' => $validatedData['payment_method'],
                'status' => $validatedData['status'],
                'payment_intent_id' => $validatedData['payment_intent_id'],
                'locale' => $validatedData['locale'],
                'currency' => isset($validatedData['currency'])
                    ? strtolower($validatedData['currency'])
                    : ($validatedData['locale'] === 'hu' ? 'huf' : 'eur'),
            ]);

            foreach ($validatedData['items'] as $item) {
                $order->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'price' => (float) $item['price_at_purchase'],
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Order successfully created.',
                'order_id' => $order->id,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order creation failed:', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Error creating order.'], 500);
        }
    }

    public function finalize(Request $request)
    {
        $request->validate([
            'payment_intent_id' => 'required|string|max:255',
            'status' => 'required|string',
        ]);

        $order = Order::where('payment_intent_id', $request->payment_intent_id)
            ->where('user_id', auth()->id())
            ->first();

        if (!$order) {
            $order = Order::where('payment_intent_id', $request->payment_intent_id)
                ->where('status', 'pending_payment')
                ->first();
        }

        if (!$order) {
            Log::error('Order not found for finalization.', ['intent_id' => $request->payment_intent_id]);
            return response()->json(['message' => 'Order not found.'], 404);
        }

        if (!in_array($order->status, ['completed', 'processing'])) {
            $order->status = $request->status;
            $order->save();
        }

        return response()->json([
            'message' => 'Order successfully finalized.',
            'order_id' => $order->id,
        ], 200);
    }

    public function retryPayment(Order $order)
    {
        if ($order->user_id !== Auth::id()) {
            return response()->json(['message' => 'Access denied.'], 403);
        }

        if (!in_array($order->status, ['failed', 'pending_payment'])) {
            return response()->json(['message' => 'This order cannot be retried.'], 400);
        }

        Stripe::setApiKey(env('STRIPE_SECRET'));

        try {
            $amountInSmallestUnit = (int) round($order->order_total);
            $currency = $order->resolvedCurrency();

            if ($currency === 'huf' && $amountInSmallestUnit < 175) {
                return response()->json(['message' => 'The amount is too low for payment.'], 400);
            }

            $intent = PaymentIntent::create([
                'amount' => $amountInSmallestUnit,
                'currency' => $currency,
                'payment_method_types' => ['card'],
                'metadata' => [
                    'order_id' => $order->id,
                    'user_id' => Auth::id(),
                ],
            ]);

            $order->payment_intent_id = $intent->id;
            $order->status = 'pending_payment';
            $order->save();

            return response()->json([
                'success' => true,
                'order_id' => $order->id,
                'client_secret' => $intent->client_secret,
            ]);

        } catch (\Exception $e) {
            Log::error("Retry Payment Error: " . $e->getMessage());
            return response()->json(['message' => 'Payment error: ' . $e->getMessage()], 500);
        }
    }

    public function requestRefund($orderId)
    {
        $order = Order::where('id', $orderId)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        if (!$order->payment_intent_id) {
            return response()->json([
                'message' => 'This order was not paid by card or the transaction ID is missing.'
            ], 400);
        }

        if (!in_array($order->status, ['processing', 'completed'])) {
            return response()->json([
                'message' => 'Only orders in processing or completed status can be refunded.'
            ], 400);
        }

        try {
            $stripe = new StripeClient(env('STRIPE_SECRET'));

            $stripe->refunds->create([
                'payment_intent' => $order->payment_intent_id,
            ]);

            $order->status = 'refunded';
            $order->save();

            return response()->json([
                'message' => 'Refund request has been successfully initiated. The money will be returned within 5-10 business days.'
            ], 200);

        } catch (\Exception $e) {
            Log::error('Refund failed for order ' . $orderId . ': ' . $e->getMessage());
            return response()->json([
                'message' => 'Error during refund process: ' . $e->getMessage()
            ], 400);
        }
    }
}