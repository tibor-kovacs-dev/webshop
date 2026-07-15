<?php

namespace App\Jobs;

use Illuminate\Support\Facades\App;
use App\Mail\OrderRecievedMailable;
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendOrderConfirmationEmail implements ShouldQueue
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
            Log::error("Confirmation Job skipped: Order #{$this->orderId} not found.");
            return;
        }

        if ($order->locale) {
            App::setLocale($order->locale); 
        }

        $recipientEmail = $order->shipping_details['email'] ?? ($order->user->email ?? null);
        
        if (!$recipientEmail) {
            Log::warning("Confirmation Job skipped: No recipient email found for Order #{$order->id}.");
            return;
        }

        try {
            Mail::to($recipientEmail)->send(new OrderRecievedMailable($order));
            
            Log::info("Confirmation email SENT to {$recipientEmail} in locale '{$order->locale}'.");
        } catch (\Exception $e) {
            Log::error("Confirmation sending failed for Order #{$order->id}: " . $e->getMessage());
        }
    }
}