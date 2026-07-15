<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderRecievedMailable extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $order;

    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    public function envelope(): Envelope
    {
        \App::setLocale($this->order->locale ?? 'hu');
        return new Envelope(
            subject: __('mail.received.title', ['orderId' => $this->order->id]),
        );
    }

    public function content(): Content
    {
        $this->order->load(['items.product']);

        return new Content(
            markdown: 'emails.orders.recieved',
            with: ['order' => $this->order]
        );
    }

    public function build()
    {
        return $this->locale($this->order->locale ?? 'hu');
    }
}