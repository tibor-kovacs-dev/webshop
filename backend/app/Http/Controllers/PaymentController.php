<?php

namespace App\Http\Controllers;

use App\Services\OrderPricingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\PaymentIntent;
use Stripe\Stripe;

class PaymentController extends Controller
{
    public function __construct(
        private readonly OrderPricingService $pricing
    ) {
    }

    public function createPaymentIntent(Request $request)
    {
        $validated = $request->validate([
            'currency' => 'required|string|in:huf,eur,usd,HUF,EUR,USD',
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer|distinct',
            'items.*.quantity' => 'required|integer|min:1|max:100',
        ]);

        $currency = strtolower($validated['currency']);

        $items = array_map(fn (array $item) => [
            'product_id' => $item['id'],
            'quantity' => $item['quantity'],
        ], $validated['items']);

        try {
            $calculation = $this->pricing->calculate($items, $currency);

            $amount = $this->pricing->toStripeAmountFromMinor(
                $calculation['total_minor'],
                $currency
            );

            if ($amount < $this->pricing->minimumStripeAmount($currency)) {
                return response()->json([
                    'message' => 'The calculated payment amount is below Stripe’s minimum allowed amount.',
                ], 422);
            }

            Stripe::setApiKey(config('services.stripe.secret'));

            $intent = PaymentIntent::create([
                'amount' => $amount,
                'currency' => $currency,
                'payment_method_types' => ['card'],
                'metadata' => [
                    'user_id' => (string) $request->user()->id,
                    'cart_hash' => hash(
                        'sha256',
                        json_encode($calculation['items'])
                    ),
                ],
            ]);

            return response()->json([
                'client_secret' => $intent->client_secret,
                'payment_intent_id' => $intent->id,
                'amount' => $amount,
                'total' => $calculation['total'],
                'total_minor' => $calculation['total_minor'],
                'currency' => $currency,
            ]);

        } catch (\Illuminate\Validation\ValidationException $exception) {
            throw $exception;

        } catch (\Throwable $exception) {
            Log::error('Stripe PaymentIntent creation failed.', [
                'exception' => $exception->getMessage(),
                'exception_class' => get_class($exception),
            ]);

            return response()->json([
                'message' => 'Payment could not be initialized. Please refresh checkout and try again.',
            ], 502);
        }
    }
}