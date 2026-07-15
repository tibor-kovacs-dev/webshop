<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\PaymentIntent;
use Stripe\Stripe;
use Stripe\FxQuote;           

class PaymentController extends Controller
{
    public function createFxQuote(Request $request)
    {
        $request->validate([
            'to_currency' => 'required|string|in:HUF,EUR,USD',
            'from_currencies' => 'array',
            'lock_duration' => 'in:five_minutes,hour,day,none'
        ]);

        Stripe::setApiKey(config('services.stripe.secret'));
        Stripe::setApiVersion('2025-07-30.preview'); 

        try {
            $fxQuote = FxQuote::create([
                'to_currency' => strtoupper($request->to_currency),
                'from_currencies' => $request->from_currencies ?? ['EUR', 'USD'],
                'lock_duration' => $request->lock_duration ?? 'hour',
                'usage' => ['type' => 'payment'],
            ]);

            return response()->json($fxQuote);
        } catch (\Exception $e) {
            Log::error("FX Quote Error: " . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
    
    public function createPaymentIntent(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric',
            'currency' => 'required|string|in:huf,eur,usd',
            'fx_quote_id' => 'nullable|string',
        ]);

        $currency = strtolower($request->currency);
        $amountInSmallestUnit = (int) $request->amount;

        if ($amountInSmallestUnit < 175 && $currency === 'huf') {
            return response()->json(['error' => 'Amount must be at least 175.00 Ft huf'], 400);
        }

        Stripe::setApiKey(config('services.stripe.secret'));

        try {
            $intentData = [
                'amount' => $amountInSmallestUnit,
                'currency' => $currency,
                'payment_method_types' => ['card'],
            ];

            if ($request->filled('fx_quote_id')) {
                $intentData['fx_quote'] = $request->fx_quote_id;
            }

            $intent = PaymentIntent::create($intentData);

            return response()->json([
                'client_secret' => $intent->client_secret,
                'payment_intent_id' => $intent->id,
            ]);
        } catch (\Exception $e) {
            Log::error("Stripe Intent Creation Failed: " . $e->getMessage());
            return response()->json(['error' => 'Stripe hiba: ' . $e->getMessage()], 500);
        }
    }
}