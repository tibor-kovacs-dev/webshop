<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'first_name' => is_string($this->first_name)
                ? trim($this->first_name)
                : $this->first_name,
            'last_name' => is_string($this->last_name)
                ? trim($this->last_name)
                : $this->last_name,
            'email' => is_string($this->email)
                ? mb_strtolower(trim($this->email))
                : $this->email,
        ]);
    }

    public function rules(): array
    {
        return [
            'first_name' => [
                'required',
                'string',
                'max:255',
            ],
            'last_name' => [
                'required',
                'string',
                'max:255',
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8),
            ],
            'password_confirmation' => [
                'required',
                'string',
            ],
            'phone' => [
                'nullable',
                'string',
                'max:30',
            ],
            'zipcode' => [
                'nullable',
                'string',
                'max:20',
            ],
            'city' => [
                'nullable',
                'string',
                'max:255',
            ],
            'street' => [
                'nullable',
                'string',
                'max:255',
            ],
            'house_number' => [
                'nullable',
                'string',
                'max:50',
            ],
            'apartment' => [
                'nullable',
                'string',
                'max:50',
            ],
        ];
    }
}
