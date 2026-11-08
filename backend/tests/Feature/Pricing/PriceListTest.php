<?php

namespace Tests\Feature\Pricing;

use App\Services\PriceListService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\Concerns\CreatesCommerceData;
use Tests\TestCase;

class PriceListTest extends TestCase
{
    use RefreshDatabase, CreatesCommerceData;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resetPriceList();
    }

    public function test_prices_are_derived_from_the_usd_base_price(): void
    {
        $prices = app(PriceListService::class)->pricesFor(800.0, 10.0);

        $this->assertEquals(800, $prices['usd']['list']);
        $this->assertEquals(720, $prices['usd']['final']);
        $this->assertEquals(680, $prices['eur']['list']);
        $this->assertEquals(612, $prices['eur']['final']);
        $this->assertEquals(262400, $prices['huf']['list']);
        $this->assertEquals(236160, $prices['huf']['final']);
    }

    public function test_prices_are_rounded_to_the_currency_step(): void
    {
        $service = app(PriceListService::class);

        $this->assertSame(0, $service->listMinor(19.0, 'huf') % 1000);
        $this->assertSame(0, $service->listMinor(19.99, 'eur') % 5);
        $this->assertSame(0, $service->finalMinor(19.0, 33.0, 'huf') % 1000);
        $this->assertSame(0, $service->finalMinor(19.99, 33.0, 'eur') % 5);
    }

    public function test_discount_is_clamped_between_zero_and_one_hundred(): void
    {
        $service = app(PriceListService::class);

        $this->assertSame($service->listMinor(100.0, 'eur'), $service->finalMinor(100.0, -20.0, 'eur'));
        $this->assertSame(0, $service->finalMinor(100.0, 250.0, 'eur'));
    }

    public function test_stored_rates_override_the_fallback_rates(): void
    {
        DB::table('exchange_rates')->where('currency', 'huf')->update(['rate' => 400]);
        PriceListService::flush();

        $this->assertEquals(320000, app(PriceListService::class)->pricesFor(800.0, 0.0)['huf']['list']);
    }

    public function test_fallback_rates_are_used_when_the_table_is_empty(): void
    {
        DB::table('exchange_rates')->delete();
        PriceListService::flush();

        $this->assertEquals(262400, app(PriceListService::class)->pricesFor(800.0, 0.0)['huf']['list']);
    }

    public function test_unsupported_currencies_are_rejected(): void
    {
        $service = app(PriceListService::class);

        $this->assertTrue($service->supports('HUF'));
        $this->assertFalse($service->supports('gbp'));

        $this->expectException(ValidationException::class);
        $service->rate('gbp');
    }

    public function test_product_endpoints_expose_the_price_list(): void
    {
        $id = $this->createProduct();

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonPath('products.0.prices.huf.final', 236160)
            ->assertJsonPath('products.0.prices.eur.list', 680);

        $this->getJson('/api/products/new')
            ->assertOk()
            ->assertJsonPath('0.prices.usd.list', 800);

        $this->getJson('/api/products/discounted')
            ->assertOk()
            ->assertJsonPath('0.prices.usd.final', 720);

        $slug = DB::table('products')->where('id', $id)->value('slug');

        $this->getJson("/api/products/$slug")
            ->assertOk()
            ->assertJsonPath('prices.huf.final', 236160);
    }

    public function test_price_endpoint_returns_prices_by_product_id(): void
    {
        $first = $this->createProduct();
        $second = $this->createProduct(['price' => 100, 'discount' => 0, 'stock' => 2]);

        $this->getJson("/api/products/prices?ids=$first,$second,9999")
            ->assertOk()
            ->assertJsonPath("$first.prices.eur.final", 612)
            ->assertJsonPath("$first.stock", 5)
            ->assertJsonPath("$second.prices.huf.final", 32800)
            ->assertJsonPath("$second.stock", 2)
            ->assertJsonMissingPath('9999');

        $this->getJson("/api/products/prices?ids[]=$first")
            ->assertOk()
            ->assertJsonPath("$first.prices.usd.final", 720);
    }

    public function test_price_endpoint_handles_missing_ids(): void
    {
        $this->getJson('/api/products/prices')->assertOk()->assertExactJson([]);
    }
}