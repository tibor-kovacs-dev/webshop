<?php

namespace App\Http\Controllers;

use App\Jobs\SendOrderConfirmationEmail;
use App\Jobs\SendOrderInvoiceEmail;
use App\Jobs\SendPaymentFailureNotification;
use App\Models\Order;
use App\Services\StockReservationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Stripe\Stripe;
use Stripe\StripeClient;
use Stripe\Webhook;

class StripeWebhookController extends Controller
{
    public function __construct(
        private readonly StockReservationService $stockReservations
    ) {
    }

    public function handleWebhook(Request $request)
    {
        Stripe::setApiKey(config('services.stripe.secret'));

        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');
        $secret = config('services.stripe.webhook_secret');

        try {
            $event = Webhook::constructEvent(
                $payload,
                $signature,
                $secret
            );
        } catch (\Throwable $exception) {
            Log::warning('Rejected invalid Stripe webhook.', [
                'exception' => $exception->getMessage(),
            ]);

            return response()->json([
                'error' => 'Invalid webhook signature or payload.',
            ], 400);
        }

        try {
            $outcome = DB::transaction(function () use ($event) {
                $now = now();

                $inserted = DB::table('stripe_webhook_events')
                    ->insertOrIgnore([
                        'stripe_event_id' => $event->id,
                        'event_type' => $event->type,
                        'status' => 'processing',
                        'attempts' => 1,
                        'last_error' => null,
                        'processed_at' => null,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);

                $eventRecord = DB::table('stripe_webhook_events')
                    ->where('stripe_event_id', $event->id)
                    ->lockForUpdate()
                    ->first();

                if (! $eventRecord) {
                    throw new \RuntimeException(
                        'Stripe webhook event could not be registered.'
                    );
                }

                if ($eventRecord->status === 'processed') {
                    return ['duplicate' => true, 'action' => null];
                }

                if (! $inserted) {
                    DB::table('stripe_webhook_events')
                        ->where('stripe_event_id', $event->id)
                        ->update([
                            'status' => 'processing',
                            'attempts' => DB::raw('attempts + 1'),
                            'last_error' => null,
                            'processed_at' => null,
                            'updated_at' => $now,
                        ]);
                }

                $action = null;

                switch ($event->type) {
                    case 'payment_intent.succeeded':
                        $action = $this->handlePaymentSucceeded(
                            $event->data->object
                        );
                        break;

                    case 'payment_intent.payment_failed':
                        $this->handlePaymentFailed(
                            $event->data->object
                        );
                        break;

                    case 'charge.refunded':
                        $this->handleChargeRefunded(
                            $event->data->object
                        );
                        break;

                    default:
                        Log::info('Unhandled Stripe event.', [
                            'type' => $event->type,
                            'event_id' => $event->id,
                        ]);
                        break;
                }

                DB::table('stripe_webhook_events')
                    ->where('stripe_event_id', $event->id)
                    ->update([
                        'status' => 'processed',
                        'processed_at' => now(),
                        'last_error' => null,
                        'updated_at' => now(),
                    ]);

                return ['duplicate' => false, 'action' => $action];
            });
        } catch (\Throwable $exception) {
            $this->recordFailure($event, $exception, false);

            return response()->json([
                'error' => 'Webhook processing failed.',
            ], 500);
        }

        if ($outcome['duplicate']) {
            return response()->json([
                'received' => true,
                'duplicate' => true,
            ]);
        }

        if ($outcome['action'] !== null) {
            try {
                $this->runPostCommitAction($outcome['action']);
            } catch (\Throwable $exception) {
                $this->recordFailure($event, $exception, true);

                return response()->json([
                    'error' => 'Webhook processing failed.',
                ], 500);
            }
        }

        return response()->json([
            'received' => true,
        ]);
    }

    private function recordFailure($event, \Throwable $exception, bool $reopen): void
    {
        try {
            DB::transaction(function () use ($event, $exception, $reopen) {
                $message = mb_substr($exception->getMessage(), 0, 5000);

                $eventRecord = DB::table('stripe_webhook_events')
                    ->where('stripe_event_id', $event->id)
                    ->lockForUpdate()
                    ->first();

                if (! $eventRecord) {
                    DB::table('stripe_webhook_events')
                        ->insertOrIgnore([
                            'stripe_event_id' => $event->id,
                            'event_type' => $event->type,
                            'status' => 'failed',
                            'attempts' => 1,
                            'last_error' => $message,
                            'processed_at' => null,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);

                    return;
                }

                if ($eventRecord->status === 'processed' && ! $reopen) {
                    return;
                }

                DB::table('stripe_webhook_events')
                    ->where('stripe_event_id', $event->id)
                    ->update([
                        'status' => 'failed',
                        'last_error' => $message,
                        'processed_at' => null,
                        'updated_at' => now(),
                    ]);
            });
        } catch (\Throwable $loggingException) {
            Log::error('Could not save Stripe webhook failure state.', [
                'event_id' => $event->id,
                'exception' => $loggingException->getMessage(),
            ]);
        }

        Log::error('Stripe webhook processing failed.', [
            'event_id' => $event->id,
            'event_type' => $event->type,
            'exception' => $exception->getMessage(),
        ]);
    }

    private function runPostCommitAction(array $action): void
    {
        if ($action['type'] !== 'refund') {
            return;
        }

        $stripe = new StripeClient(config('services.stripe.secret'));

        $stripe->refunds->create([
            'payment_intent' => $action['payment_intent_id'],
        ], [
            'idempotency_key' => sprintf('order-%s-auto-refund', $action['order_id']),
        ]);

        Log::warning('Late payment automatically refunded because stock was no longer available.', [
            'order_id' => $action['order_id'],
            'payment_intent_id' => $action['payment_intent_id'],
        ]);
    }

    private function handlePaymentSucceeded($intent): ?array
    {
        $order = Order::where(
            'payment_intent_id',
            $intent->id
        )->lockForUpdate()->first();

        if (! $order) {
            Log::warning(
                'Successful PaymentIntent has no matching order.',
                [
                    'payment_intent_id' => $intent->id,
                ]
            );

            return null;
        }

        $expectedAmount = $order->totalMinor();

        if (
            (int) $intent->amount_received !== $expectedAmount ||
            strtolower($intent->currency) !== $order->resolvedCurrency() ||
            (string) ($intent->metadata->user_id ?? '') !== (string) $order->user_id ||
            (
                ! empty($intent->metadata->order_id) &&
                (string) $intent->metadata->order_id !== (string) $order->id
            )
        ) {
            Log::critical('Stripe payment does not match its order.', [
                'order_id' => $order->id,
                'payment_intent_id' => $intent->id,
            ]);

            return null;
        }

        $recoverable = in_array($order->status, ['pending_payment', 'failed'], true)
            || (
                $order->status === 'refund_pending' &&
                $order->stock_status === 'released'
            );

        if (! $recoverable) {
            return null;
        }

        if ($order->stock_status === 'released') {
            try {
                $this->stockReservations->reserve($order);
            } catch (ValidationException $exception) {
                $order->status = 'refund_pending';
                $order->save();

                return [
                    'type' => 'refund',
                    'order_id' => $order->id,
                    'payment_intent_id' => $intent->id,
                ];
            }
        }

        $order->status = 'processing';
        $this->stockReservations->commit($order);
        $order->save();

        SendOrderConfirmationEmail::dispatch($order->id)->afterCommit();
        SendOrderInvoiceEmail::dispatch($order->id)->afterCommit();

        return null;
    }

    private function handlePaymentFailed($intent): void
    {
        $order = Order::where(
            'payment_intent_id',
            $intent->id
        )->lockForUpdate()->first();

        if (! $order || $order->status !== 'pending_payment') {
            return;
        }

        $order->status = 'failed';
        $this->stockReservations->release($order);
        $order->save();

        SendPaymentFailureNotification::dispatch($order->id)->afterCommit();
    }

    private function handleChargeRefunded($charge): void
    {
        $paymentIntentId = $charge->payment_intent ?? null;

        if (! $paymentIntentId || ! $charge->refunded) {
            return;
        }

        $order = Order::where(
            'payment_intent_id',
            $paymentIntentId
        )->lockForUpdate()->first();

        if (
            $order &&
            in_array(
                $order->status,
                ['refund_pending', 'processing', 'completed'],
                true
            )
        ) {
            $order->status = 'refunded';
            $this->stockReservations->restock($order);
            $order->save();
        }
    }
}