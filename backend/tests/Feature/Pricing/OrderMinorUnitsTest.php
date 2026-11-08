<?php

namespace Tests\Feature\Pricing;

use App\Models\User;
use App\Services\OrderPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesCommerceData;
use Tests\TestCase;

class OrderMinorUnitsTest extends TestCase
{
    use RefreshDatabase, CreatesCommerceData;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resetPriceList();
    }

    public function test_calculation_returns_integer_minor_units(): void
    {
        $id = $this->createProduct();

        $calculation = app(OrderPricingService::class)->calculate(
            [['product_id' => $id, 'quantity' => 3]],
            'huf'
        );

        $this->assertSame(23616000, $calculation['items'][0]['price_minor']);
        $this->assertSame(70848000, $calculation['total_minor']);
    }

    public function test_orders_store_minor_units_next_to_the_decimal_columns(): void
    {
        $user = User::factory()->create();
        $id = $this->createProduct();

        $order = $this->createOrder($user, $id, 3, 'eur');
        $order->refresh();

        $this->assertSame(183600, $order->order_total_minor);
        $this->assertEquals(1836, $order->order_total);
        $this->assertSame(61200, $order->items()->first()->price_minor);
    }
}