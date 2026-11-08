<?php

use App\Models\Order;
use App\Services\StockReservationService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\PaymentIntent;
use Stripe\Stripe;

Artisan::command('orders:release-expired-stock', function (StockReservationService $stockReservations) {
    Stripe::setApiKey(config('services.stripe.secret'));

    Order::whereIn('status', ['pending_payment', 'failed'])
        ->where('stock_status', 'reserved')
        ->whereNotNull('stock_reserved_until')
        ->where('stock_reserved_until', '<=', now())
        ->orderBy('id')
        ->chunkById(50, function ($orders) use ($stockReservations) {
            foreach ($orders as $candidate) {
                try {
                    if ($candidate->payment_intent_id) {
                        $intent = PaymentIntent::retrieve($candidate->payment_intent_id);

                        if ($intent->status === 'succeeded') {
                            continue;
                        }

                        if ($intent->status !== 'canceled') {
                            if (in_array($intent->status, [
                                'requires_payment_method',
                                'requires_confirmation',
                                'requires_action',
                                'requires_capture',
                            ], true)) {
                                $intent->cancel();
                            } else {
                                continue;
                            }
                        }
                    }

                    DB::transaction(function () use ($candidate, $stockReservations) {
                        $order = Order::whereKey($candidate->id)
                            ->lockForUpdate()
                            ->first();

                        if (
                            !$order ||
                            !in_array($order->status, ['pending_payment', 'failed'], true) ||
                            $order->stock_status !== 'reserved' ||
                            !$order->stock_reserved_until ||
                            $order->stock_reserved_until->isFuture()
                        ) {
                            return;
                        }

                        $stockReservations->release($order);
                        $order->status = 'failed';
                        $order->save();
                    });
                } catch (\Throwable $e) {
                    Log::error('Expired stock reservation could not be released.', [
                        'order_id' => $candidate->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        });

    $this->info('Expired order stock reservations processed.');
})->purpose('Cancel expired unpaid PaymentIntents and release reserved product stock');