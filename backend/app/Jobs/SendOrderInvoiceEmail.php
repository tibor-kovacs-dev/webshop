<?php

namespace App\Jobs;

use App\Mail\OrderInvoiceMailable; // 💡 Itt a számla Mailable van!
use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\App; 

class SendOrderInvoiceEmail implements ShouldQueue
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
            Log::error("Invoice Job skipped: Order #{$this->orderId} not found.");
            return;
        }

        if ($order->locale) {
            App::setLocale($order->locale); 
        }

        $recipientEmail = $order->shipping_details['email'] ?? ($order->user->email ?? null);
        
        if (!$recipientEmail) {
            Log::warning("Invoice Job skipped: No recipient email found for Order #{$order->id}.");
            return;
        }

        try {
            Mail::to($recipientEmail)->send(new OrderInvoiceMailable($order));
            Log::info("Invoice email SENT to {$recipientEmail} in locale '{$order->locale}'.");
        } catch (\Exception $e) {
            Log::error("Invoice sending failed for Order #{$order->id}: " . $e->getMessage());
        }
    }
}