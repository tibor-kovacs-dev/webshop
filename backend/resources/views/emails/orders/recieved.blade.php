<x-mail::message>
# {{ __('mail.received.title') }}

{{ __('mail.received.greeting') }}

{{ __('mail.received.order_id') }}: **#{{ $order->id }}**

@php
    $currencyCode = $order->resolvedCurrency();
    $symbol = ['huf' => 'Ft', 'eur' => '€', 'usd' => '$'][$currencyCode] ?? strtoupper($currencyCode);
    $decimals = $currencyCode === 'huf' ? 0 : 2;
    $money = fn ($amount) => number_format((float) $amount, $decimals, ',', ' ') . ' ' . $symbol;
@endphp

<x-mail::panel>
### {{ __('mail.summary.title') }}
**{{ __('mail.summary.date') }}:** {{ $order->created_at->format('Y. F d.') }}
**{{ __('mail.summary.payment_method') }}:** {{ $order->payment_method }}
**{{ __('mail.summary.paid') }}:** **{{ $money($order->order_total) }}**
</x-mail::panel>

<x-mail::button :url="url('/profile/orders/' . $order->id)">
{{ __('mail.button.track_order') }}
</x-mail::button>

### {{ __('mail.items.title') }}

<x-mail::table>
| {{ __('mail.items.product_name') }} | {{ __('mail.items.quantity') }} | {{ __('mail.items.unit_price') }} | {{ __('mail.items.total') }} |
| :------------- | :-------------: | :-------------: | -------------: |
@foreach ($order->items as $item)
| {{ $item->product->name ?? 'Ismeretlen termék' }} | {{ $item->quantity }} db | {{ $money($item->price ?? 0) }} | {{ $money(($item->price ?? 0) * $item->quantity) }} |
@endforeach
| | | {{ __('mail.items.shipping_fee') }}: | {{ $money(0) }} |
| | | {{ __('mail.items.grand_total') }}: | {{ $money($order->order_total) }} |
</x-mail::table>

{{ __('mail.received.footer_note') }}

{{ __('mail.closing') }},  
{{ __('mail.team_name', ['app_name' => config('app.name')]) }}
</x-mail::message>