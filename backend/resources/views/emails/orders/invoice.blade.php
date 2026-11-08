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
    $shipping = is_array($shipping) ? $shipping : [];
    $address = trim(
        trim(($shipping['zipcode'] ?? '') . ' ' . ($shipping['city'] ?? '')) . ', '
        . trim(($shipping['street'] ?? '') . ' ' . ($shipping['house_number'] ?? '') . ' ' . ($shipping['apartment'] ?? '')),
        ' ,'
    );
    $currencyCode = $order->resolvedCurrency();
    $symbol = ['huf' => 'Ft', 'eur' => '€', 'usd' => '$'][$currencyCode] ?? strtoupper($currencyCode);
    $decimals = $currencyCode === 'huf' ? 0 : 2;
    $money = fn ($amount) => number_format((float) $amount, $decimals, ',', ' ') . ' ' . $symbol;
@endphp

**{{ __('mail.billing.name') }}:** {{ $shipping['first_name'] ?? __('mail.billing.not_provided') }} {{ $shipping['last_name'] ?? '' }}
**{{ __('mail.billing.address') }}:** {{ $address !== '' ? $address : __('mail.billing.not_provided') }}

<x-mail::panel>
### {{ __('mail.payment_info.title') }}
**{{ __('mail.payment_info.transaction_id') }}:** {{ $order->payment_intent_id }}
**{{ __('mail.payment_info.status') }}:** **{{ __('mail.payment_info.paid_status') }}**
**{{ __('mail.payment_info.total') }}:** **{{ $money($order->order_total) }}**
</x-mail::panel>

<x-mail::table>
| {{ __('mail.items.product_name') }} | {{ __('mail.items.price_vat') }} | {{ __('mail.items.quantity') }} | {{ __('mail.items.total') }} |
| :------------- | :-------------: | :-------------: | -------------: |
@foreach ($order->products as $product)
| {{ $product->title ?? $product->name }} | {{ $money($product->pivot->price ?? 0) }} | {{ $product->pivot->quantity ?? 1 }} db | {{ $money(($product->pivot->price ?? 0) * ($product->pivot->quantity ?? 1)) }} |
@endforeach
| | | **{{ __('mail.items.shipping_fee') }}:** | {{ $money(0) }} |
| | | **{{ __('mail.items.due_total') }}:** | **{{ $money($order->order_total) }}** |
</x-mail::table>

**{{ __('mail.invoice.note_label') }}:**  
{{ __('mail.invoice.note_content') }}

{{ __('mail.closing') }},  
{{ __('mail.financial_team') }}
</x-mail::message>