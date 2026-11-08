<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Validation\ValidationException;

class StockReservationService
{
    private const RESERVATION_MINUTES = 30;

    public function reserve(Order $order): void
    {
        if ($order->stock_status === 'reserved') {
            $order->stock_reserved_until = now()->addMinutes(self::RESERVATION_MINUTES);
            $order->save();

            return;
        }

        if (in_array($order->stock_status, ['committed', 'restocked'], true)) {
            return;
        }

        $items = $this->orderedItems($order);
        $products = $this->lockedProducts($items);

        foreach ($items as $item) {
            $product = $products->get($item->product_id);

            if (! $product || (int) $product->stock < (int) $item->quantity) {
                throw ValidationException::withMessages([
                    'items' => 'One or more products are no longer available in the requested quantity.',
                ]);
            }
        }

        foreach ($items as $item) {
            $products->get($item->product_id)->decrement('stock', $item->quantity);
        }

        $order->stock_status = 'reserved';
        $order->stock_reserved_until = now()->addMinutes(self::RESERVATION_MINUTES);
        $order->save();
    }

    public function release(Order $order): void
    {
        if ($order->stock_status !== 'reserved') {
            return;
        }

        $this->returnToStock($order);

        $order->stock_status = 'released';
        $order->stock_reserved_until = null;
        $order->save();
    }

    public function commit(Order $order): void
    {
        if ($order->stock_status === 'reserved') {
            $order->stock_status = 'committed';
            $order->stock_reserved_until = null;
            $order->save();
        }
    }

    public function restock(Order $order): void
    {
        if ($order->stock_status !== 'committed') {
            return;
        }

        $this->returnToStock($order);

        $order->stock_status = 'restocked';
        $order->stock_reserved_until = null;
        $order->save();
    }

    private function returnToStock(Order $order): void
    {
        $items = $this->orderedItems($order);
        $products = $this->lockedProducts($items);

        foreach ($items as $item) {
            $product = $products->get($item->product_id);

            if ($product) {
                $product->increment('stock', $item->quantity);
            }
        }
    }

    private function orderedItems(Order $order)
    {
        return $order->items()
            ->orderBy('product_id')
            ->get();
    }

    private function lockedProducts($items)
    {
        return Product::whereIn('id', $items->pluck('product_id'))
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');
    }
}