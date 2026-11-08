<?php

namespace Tests\Feature\Pricing;

use App\Services\OrderPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\CreatesCommerceData;
use Tests\TestCase;

class OrderPricingTest extends TestCase
{
    use RefreshDatabase, CreatesCommerceData;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resetPriceList();
    }

    public function test_totals_use_the_discounted_unit_price(): void
    {
        $id = $this->createProduct();
        $service = app(OrderPricingService::class);

        $huf = $service->calculate(
            [['product_id' => $id, 'quantity' => 3]],
            'huf'
        );

        $this->assertEquals(236160, $huf['items'][0]['price']);
        $this->assertEquals(708480, $huf['total']);
        $this->assertSame(
            70848000,
            $service->toStripeAmountFromMinor($huf['total_minor'], 'huf')
        );

        $eur = $service->calculate(
            [['product_id' => $id, 'quantity' => 3]],
            'EUR'
        );

        $this->assertEquals(1836, $eur['total']);
        $this->assertSame(
            183600,
            $service->toStripeAmountFromMinor($eur['total_minor'], 'eur')
        );
    }

    public function test_multiple_lines_are_summed_without_float_drift(): void
    {
        $first = $this->createProduct([
            'price' => 19,
            'discount' => 0,
            'stock' => 10,
        ]);

        $second = $this->createProduct([
            'price' => 7,
            'discount' => 15,
            'stock' => 10,
        ]);

        $calculation = app(OrderPricingService::class)->calculate([
            ['product_id' => $first, 'quantity' => 3],
            ['product_id' => $second, 'quantity' => 7],
        ], 'eur');

        $expectedMinor = 0;

        foreach ($calculation['items'] as $item) {
            $expectedMinor += (int) round($item['price'] * 100)
                * $item['quantity'];
        }

        $this->assertSame(
            $expectedMinor,
            $calculation['total_minor']
        );

        $this->assertSame(
            $expectedMinor,
            (int) round($calculation['total'] * 100)
        );
    }

    public function test_client_supplied_prices_are_ignored(): void
    {
        $id = $this->createProduct();

        $calculation = app(OrderPricingService::class)->calculate([
            [
                'product_id' => $id,
                'quantity' => 1,
                'price' => 1,
            ],
        ], 'huf');

        $this->assertEquals(236160, $calculation['total']);
    }

    public function test_insufficient_stock_is_rejected(): void
    {
        $id = $this->createProduct(['stock' => 2]);

        $this->expectException(ValidationException::class);

        app(OrderPricingService::class)->calculate(
            [['product_id' => $id, 'quantity' => 3]],
            'huf'
        );
    }

    public function test_stock_check_can_be_skipped_for_display_calculations(): void
    {
        $id = $this->createProduct(['stock' => 0]);

        $calculation = app(OrderPricingService::class)->calculate(
            [['product_id' => $id, 'quantity' => 2]],
            'huf',
            false
        );

        $this->assertEquals(472320, $calculation['total']);
    }

    public function test_unknown_products_and_currencies_are_rejected(): void
    {
        $id = $this->createProduct();
        $service = app(OrderPricingService::class);

        try {
            $service->calculate(
                [['product_id' => 99999, 'quantity' => 1]],
                'huf'
            );

            $this->fail('Unknown product was accepted.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey(
                'items',
                $exception->errors()
            );
        }

        $this->expectException(ValidationException::class);

        $service->calculate(
            [['product_id' => $id, 'quantity' => 1]],
            'gbp'
        );
    }

    public function test_stripe_minimum_amounts(): void
    {
        $id = $this->createProduct();
        $service = app(OrderPricingService::class);

        $huf = $service->calculate(
            [['product_id' => $id, 'quantity' => 3]],
            'huf'
        );

        $this->assertSame(
            70848000,
            $service->toStripeAmountFromMinor(
                $huf['total_minor'],
                'huf'
            )
        );

        $this->assertSame(17500, $service->minimumStripeAmount('huf'));
        $this->assertSame(50, $service->minimumStripeAmount('eur'));
        $this->assertSame(50, $service->minimumStripeAmount('usd'));
    }
}