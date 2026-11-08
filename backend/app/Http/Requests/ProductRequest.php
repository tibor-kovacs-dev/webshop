<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    private const IMAGE_RULES = [
        'string',
        'max:255',
        'regex:#^(https?://[^\s]+|/[A-Za-z0-9._/\-]+)$#',
        'not_regex:#\.\.#',
    ];

    public function authorize(): bool
    {
        return (bool) $this->user()?->is_admin;
    }

    public function rules(): array
    {
        if ($this->isMethod('PATCH')) {
            return [
                'category' => 'sometimes|required|string|min:2',
                'name' => 'sometimes|required|string|min:3',
                'slug' => 'sometimes|required|string|min:3|unique:products,slug,' . $this->route('id'),
                'description' => 'sometimes|required|string|min:10',
                'image' => array_merge(['sometimes', 'required'], self::IMAGE_RULES),
                'price' => 'sometimes|required|numeric|min:0',
                'discount' => 'sometimes|required|numeric|min:0|max:100',
                'stock' => 'sometimes|required|integer|min:0',
            ];
        }

        return [
            'category' => 'required|string|min:2',
            'name' => 'required|string|min:3',
            'slug' => 'required|string|min:3|unique:products,slug',
            'description' => 'required|string|min:10',
            'image' => array_merge(['required'], self::IMAGE_RULES),
            'price' => 'required|numeric|min:0',
            'discount' => 'nullable|numeric|min:0|max:100',
            'stock' => 'required|integer|min:0',
        ];
    }
}