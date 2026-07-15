<x-mail::message>
# {{ __('mail.failed.title') }}

{{ __('mail.failed.greeting', ['order_id' => $order->id]) }}

{{-- Javítva: Ft helyett a nyelvi fájlból vett pénznem --}}
**{{ __('mail.payment_info.total') }}:** **{{ number_format($order->order_total, 0, ',', ' ') }} {{ __('mail.currency') }}**

{{ __('mail.failed.reason') }}

### {{ __('mail.failed.next_steps') }}

{{ __('mail.failed.retry_instruction') }}

<x-mail::button :url="url('/payment/retry/' . $order->id)">
{{ __('mail.button.retry_payment') }}
</x-mail::button>

{{ __('mail.closing') }},
{{ __('mail.team_name', ['app_name' => config('app.name')]) }}
</x-mail::message>