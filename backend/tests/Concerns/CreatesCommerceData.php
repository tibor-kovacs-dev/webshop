<?php

namespace Tests\Concerns;

use App\Models\Order;
use App\Models\User;
use App\Services\OrderPricingService;
use App\Services\PriceListService;
use Illuminate\Support\Facades\DB;

trait CreatesCommerceData
{
    protected function resetPriceList(): void
    {
        PriceListService::flush();
    }

    protected function createProduct(array $overrides = []): int
    {
        return DB::table('products')->insertGetId(array_merge([
            'category' => 'phones',
            'name' => 'Test product',
            'slug' => 'test-product-' . uniqid(),
            'description' => json_encode(['en' => 'A test product description']),
            'image' => '/images/test-product.jpg',
            'price' => 800,
            'stock' => 5,
            'discount' => 10,
            'rating_count' => 0,
        ], $overrides));
    }

    protected function createAdmin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['is_admin' => true])->save();

        return $admin;
    }

    protected function createOrder(
        User $user,
        int $productId,
        int $quantity = 1,
        string $currency = 'huf',
        array $overrides = []
    ): Order {
        $calculation = app(OrderPricingService::class)->calculate(
            [['product_id' => $productId, 'quantity' => $quantity]],
            $currency
        );

        $order = Order::create(array_merge([
            'user_id' => $user->id,
            'order_total' => $calculation['total'],
            'order_total_minor' => $calculation['total_minor'],
            'shipping_details' => ['first_name' => 'Test'],
            'payment_method' => 'credit_card_stripe',
            'status' => 'pending_payment',
            'payment_intent_id' => 'pi_order_' . uniqid(),
            'locale' => 'hu',
            'currency' => $currency,
        ], $overrides));

        foreach ($calculation['items'] as $item) {
            $order->items()->create($item);
        }

        return $order;
    }

    protected function productStock(int $productId): int
    {
        return (int) DB::table('products')->where('id', $productId)->value('stock');
    }
}