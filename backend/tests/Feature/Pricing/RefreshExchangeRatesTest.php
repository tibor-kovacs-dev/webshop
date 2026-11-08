<?php

namespace Tests\Feature\Pricing;

use App\Services\PriceListService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\CreatesCommerceData;
use Tests\TestCase;

class RefreshExchangeRatesTest extends TestCase
{
    use RefreshDatabase, CreatesCommerceData;

    protected function setUp(): void
    {
        parent::setUp();

        $this->resetPriceList();
    }

    private function rate(string $currency): float
    {
        return (float) DB::table('exchange_rates')->where('currency', $currency)->value('rate');
    }

    public function test_rates_are_fetched_and_stored(): void
    {
        Http::fake([
            'api.frankfurter.dev/*' => Http::response([
                'base' => 'USD',
                'date' => '2026-11-03',
                'rates' => ['EUR' => 0.86, 'HUF' => 330.0],
            ]),
        ]);

        $this->artisan('rates:refresh')->assertExitCode(0);

        $this->assertEquals(0.86, $this->rate('eur'));
        $this->assertEquals(330, $this->rate('huf'));
        $this->assertSame(
            'frankfurter:2026-11-03',
            DB::table('exchange_rates')->where('currency', 'huf')->value('source')
        );
        $this->assertNotNull(DB::table('exchange_rates')->where('currency', 'huf')->value('fetched_at'));

        Http::assertSent(fn ($request) => $request['base'] === 'USD' && $request['symbols'] === 'EUR,HUF');
    }

    public function test_the_price_list_changes_after_a_refresh(): void
    {
        Http::fake([
            'api.frankfurter.dev/*' => Http::response(['rates' => ['EUR' => 0.86, 'HUF' => 330.0]]),
        ]);

        $this->assertEquals(236160, app(PriceListService::class)->pricesFor(800.0, 10.0)['huf']['final']);

        $this->artisan('rates:refresh')->assertExitCode(0);

        $this->assertEquals(237600, app(PriceListService::class)->pricesFor(800.0, 10.0)['huf']['final']);
    }

    public function test_a_large_rate_jump_is_rejected_unless_forced(): void
    {
        Http::fake([
            'api.frankfurter.dev/*' => Http::response(['rates' => ['EUR' => 0.86, 'HUF' => 500.0]]),
        ]);

        $this->artisan('rates:refresh')->assertExitCode(1);
        $this->assertEquals(328, $this->rate('huf'));

        $this->artisan('rates:refresh --force')->assertExitCode(0);
        $this->assertEquals(500, $this->rate('huf'));
    }

    public function test_a_failed_request_keeps_the_stored_rates(): void
    {
        Http::fake([
            'api.frankfurter.dev/*' => Http::response([], 500),
        ]);

        $this->artisan('rates:refresh')->assertExitCode(1);

        $this->assertEquals(328, $this->rate('huf'));
        $this->assertEquals(0.85, $this->rate('eur'));
    }

    public function test_a_response_without_a_required_currency_is_rejected(): void
    {
        Http::fake([
            'api.frankfurter.dev/*' => Http::response(['rates' => ['EUR' => 0.86]]),
        ]);

        $this->artisan('rates:refresh --force')->assertExitCode(1);

        $this->assertEquals(0.85, $this->rate('eur'));
    }
}