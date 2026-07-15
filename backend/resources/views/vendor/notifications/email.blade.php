<x-mail::message>
# {{ $actionText ?? 'Password Reset' }}

{{ __('Hello!') }}

{{ __('You are receiving this email because we received a password reset request for your account.') }}

<x-mail::button :url="$actionUrl">
    {{ $actionText ?? 'Reset Password' }}
</x-mail::button>

{{ __('This password reset link will expire in :count minutes.', ['count' => config('auth.passwords.'.config('auth.defaults.passwords').'.expire')]) }}

{{ __('If you did not request a password reset, no further action is required.') }}

{{ __('Regards') }},<br>
{{ config('app.name') }}

<x-slot name="subcopy">
    {{ __('If you’re having trouble clicking the ":actionText" button, copy and paste the URL below into your web browser:', ['actionText' => $actionText]) }}<br>
    <span class="break-all">{{ $actionUrl }}</span>
</x-slot>
</x-mail::message>