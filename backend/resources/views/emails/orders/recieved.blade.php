<x-mail::message>
# {{ __('mail.received.title') }}

{{ __('mail.received.greeting') }}

{{ __('mail.received.order_id') }}: **#{{ $order->id }}**

@php
    $currency = __('mail.currency');
@endphp

<x-mail::panel>
### {{ __('mail.summary.title') }}
**{{ __('mail.summary.date') }}:** {{ $order->created_at->format('Y. F d.') }}
**{{ __('mail.summary.payment_method') }}:** {{ $order->payment_method }}
**{{ __('mail.summary.paid') }}:** **{{ number_format($order->order_total, 0, ',', ' ') }} {{ $currency }}**
</x-mail::panel>

<x-mail::button :url="url('/profile/orders/' . $order->id)">
{{ __('mail.button.track_order') }}
</x-mail::button>

### {{ __('mail.items.title') }}

<x-mail::table>
| {{ __('mail.items.product_name') }} | {{ __('mail.items.quantity') }} | {{ __('mail.items.unit_price') }} | {{ __('mail.items.total') }} |
| :------------- | :-------------: | :-------------: | -------------: |
@foreach ($order->items as $item)
@php
    $unitPrice = $item->price ?? 0;   <!-- Fontos: $item->price (OrderItem model) -->
@endphp
| {{ $item->product->name ?? 'Ismeretlen termék' }} | {{ $item->quantity }} db | {{ number_format($unitPrice, 0, ',', ' ') }} {{ $currency }} | {{ number_format($unitPrice * $item->quantity, 0, ',', ' ') }} {{ $currency }} | 
@endforeach
| | | {{ __('mail.items.shipping_fee') }}: | 0 {{ $currency }} | 
| | | {{ __('mail.items.grand_total') }}: | {{ number_format($order->order_total, 0, ',', ' ') }} {{ $currency }} |
</x-mail::table>

{{ __('mail.received.footer_note') }}

{{ __('mail.closing') }},  
{{ __('mail.team_name', ['app_name' => config('app.name')]) }}
</x-mail::message>