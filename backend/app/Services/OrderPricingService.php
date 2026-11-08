<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Validation\ValidationException;

class OrderPricingService
{
    public function __construct(
        private readonly PriceListService $priceList
    ) {
    }

    public function calculate(
        array $items,
        string $currency,
        bool $checkStock = true
    ): array {
        $currency = strtolower($currency);

        if (! $this->priceList->supports($currency)) {
            throw ValidationException::withMessages([
                'currency' => 'Unsupported currency.',
            ]);
        }

        $ids = collect($items)->pluck('product_id')->unique()->values();

        $products = Product::query()
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        $lines = [];
        $totalMinor = 0;

        foreach ($items as $item) {
            $product = $products->get((int) $item['product_id']);
            $quantity = (int) $item['quantity'];

            if (! $product || $quantity < 1) {
                throw ValidationException::withMessages([
                    'items' => 'One or more products are invalid.',
                ]);
            }

            if (
                $checkStock &&
                isset($product->stock) &&
                (int) $product->stock < $quantity
            ) {
                throw ValidationException::withMessages([
                    'items' => "Insufficient stock for product {$product->id}.",
                ]);
            }

            $unitMinor = $this->priceList->finalMinor(
                $product->getRawOriginal('price') ?? 0,
                $product->getRawOriginal('discount') ?? 0,
                $currency
            );

            $lines[] = [
                'product_id' => $product->id,
                'quantity' => $quantity,
                'price' => $unitMinor / 100,
                'price_minor' => $unitMinor,
            ];

            $totalMinor += $unitMinor * $quantity;
        }

        return [
            'items' => $lines,
            'total' => $totalMinor / 100,
            'total_minor' => $totalMinor,
            'currency' => $currency,
        ];
    }

    public function toStripeAmountFromMinor(
        int $totalMinor,
        string $currency
    ): int {
        if (! $this->priceList->supports($currency)) {
            throw ValidationException::withMessages([
                'currency' => 'Unsupported currency.',
            ]);
        }

        if ($totalMinor <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'The payment amount must be positive.',
            ]);
        }

        return $totalMinor;
    }

    public function minimumStripeAmount(string $currency): int
    {
        return match (strtolower($currency)) {
            'huf' => 17500,
            'eur', 'usd' => 50,
            default => PHP_INT_MAX,
        };
    }
}