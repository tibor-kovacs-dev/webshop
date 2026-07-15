<?php

namespace App\Jobs;

use App\Mail\PaymentFailedMailable; // 💡 A HIBÁRA VONATKOZÓ MAILABLE
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\App; 

class SendPaymentFailureNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $orderId;

    public function __construct(int $orderId)
    {
        $this->orderId = $orderId;
    }

    public function handle(): void
    {
        $order = Order::with(['user', 'items.product'])->find($this->orderId);

        if (!$order) {
            Log::error("Payment Failure Job skipped: Order #{$this->orderId} not found.");
            return;
        }

        if ($order->locale) {
            App::setLocale($order->locale); 
        }

        $recipientEmail = $order->shipping_details['email'] ?? ($order->user->email ?? null);
        
        if (!$recipientEmail) {
            Log::warning("Payment Failure Job skipped: No recipient email found for Order #{$order->id}.");
            return;
        }

        try {
            Mail::to($recipientEmail)->send(new PaymentFailedMailable($order));
            
            Log::info("Payment failure notification SENT to {$recipientEmail} in locale '{$order->locale}'.");
        } catch (\Exception $e) {
            Log::error("Payment Failure sending failed for Order #{$order->id}: " . $e->getMessage());
        }
    }
}