<x-mail::message>
# {{ __('mail.invoice.title') }}

{{ __('mail.invoice.greeting') }}

@if ($order->user)
**{{ __('mail.invoice.account_owner') }}:** {{ $order->user->name }}
@endif

---

### {{ __('mail.billing.title') }}
@php
    $shipping = is_array($order->shipping_details) ? $order->shipping_details : json_decode($order->shipping_details, true);
    $currency = __('mail.currency');
@endphp

**{{ __('mail.billing.name') }}:** {{ $shipping['first_name'] ?? __('mail.billing.not_provided') }} {{ $shipping['last_name'] ?? '' }}
**{{ __('mail.billing.address') }}:** {{ $shipping['address'] ?? __('mail.billing.not_provided') }}

<x-mail::panel>
### {{ __('mail.payment_info.title') }}
**{{ __('mail.payment_info.transaction_id') }}:** {{ $order->payment_intent_id }}
**{{ __('mail.payment_info.status') }}:** **{{ __('mail.payment_info.paid_status') }}**
**{{ __('mail.payment_info.total') }}:** **{{ number_format($order->order_total, 0, ',', ' ') }} {{ $currency }}**
</x-mail::panel>

<x-mail::table>
| {{ __('mail.items.product_name') }} | {{ __('mail.items.price_vat') }} | {{ __('mail.items.quantity') }} | {{ __('mail.items.total') }} |
| :------------- | :-------------: | :-------------: | -------------: |
@foreach ($order->products as $product)
@php
    $quantity = $product->pivot->quantity ?? 1;
    $price_at_purchase = $product->pivot->price ?? 0;   <!-- Itt a pivot price van -->
    $line_total = $price_at_purchase * $quantity;
@endphp
| {{ $product->title ?? $product->name }} | {{ number_format($price_at_purchase, 0, ',', ' ') }} {{ $currency }} | {{ $quantity }} db | {{ number_format($line_total, 0, ',', ' ') }} {{ $currency }} | 
@endforeach
| | | **{{ __('mail.items.shipping_fee') }}:** | 0 {{ $currency }} | 
| | | **{{ __('mail.items.due_total') }}:** | **{{ number_format($order->order_total, 0, ',', ' ') }} {{ $currency }}** |
</x-mail::table>

**{{ __('mail.invoice.note_label') }}:**  
{{ __('mail.invoice.note_content') }}

{{ __('mail.closing') }},  
{{ __('mail.financial_team') }}
</x-mail::message>