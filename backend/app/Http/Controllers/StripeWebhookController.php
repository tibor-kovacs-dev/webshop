<?php
namespace App\Http\Controllers;

use App\Jobs\SendOrderConfirmationEmail; // <- ÚJ IMPORT
use App\Jobs\SendOrderInvoiceEmail;
use App\Jobs\SendPaymentFailureNotification;
use App\Models\Order; // <- ÚJ IMPORT
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;

class StripeWebhookController extends Controller
{
    public function handleWebhook(Request $request)
    {
        \Illuminate\Support\Facades\Log::debug('!!! WEBHOOK KÉRÉS INDULT !!!');

        \Stripe\Stripe::setApiKey(env('STRIPE_SECRET'));

        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $endpointSecret = env('STRIPE_WEBHOOK_SECRET');

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $endpointSecret);

        } catch (SignatureVerificationException $e) {
            return response()->json(['error' => 'Invalid payload'], 400);
        }

        switch ($event->type) {
            case 'payment_intent.succeeded':
                $this->handlePaymentIntentSucceeded($event->data->object);
                break;
            case 'payment_intent.payment_failed':
                $this->handlePaymentIntentFailed($event->data->object);
                break;
            default:
                Log::info("Unhandled Stripe event type: {$event->type}");
                break;
        }

        return response()->json(['success' => true]);
    }

    protected function handlePaymentIntentSucceeded($intent)
{
    Log::info("Processing payment_intent.succeeded for intent ID: {$intent->id}");

    $order = Order::where('payment_intent_id', $intent->id)->first();

    if (! $order) {
        Log::warning("Webhook received for intent {$intent->id}, but matching Order not found for status update.");
        return;
    }

    if ($order->status === 'pending_payment') {

        $order->status = 'processing';
        $order->save();
        
        Log::info("Order #{$order->id} status updated to 'processing' by Webhook.");

        Log::info("Dispatching confirmation email job for Order #{$order->id}.");
        SendOrderConfirmationEmail::dispatch($order->id); 

        Log::info("Dispatching invoice email job for Order #{$order->id}.");
        SendOrderInvoiceEmail::dispatch($order->id); 

    } else {
        Log::warning("Webhook Succeeded skipped: Order #{$order->id} already processed or in final state ({$order->status}).");
    }
}

    protected function handlePaymentIntentFailed($intent)
    {
        Log::info("Processing payment_intent.payment_failed for intent ID: {$intent->id}");

        $order = Order::where('payment_intent_id', $intent->id)->first();

        if ($order) {
            $order->status = 'failed';
            $order->save();

            Log::warning("Order #{$order->id} status set to FAILED due to payment intent failure.");

            $recipientEmail = $order->shipping_details['email'] ?? ($order->user->email ?? null);

            if ($recipientEmail) {
                SendPaymentFailureNotification::dispatch($order->id);
                Log::info("Payment failed notification JOB QUEUED for Order #{$order->id}.");
            } else {
                Log::error("Cannot send payment failed email: Email address not found for Order #{$order->id}.");
            }
        }
    }
}
