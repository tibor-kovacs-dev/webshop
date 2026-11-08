<?php

namespace App\Console\Commands;

use App\Services\PriceListService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RefreshExchangeRates extends Command
{
    protected $signature = 'rates:refresh {--force}';

    protected $description = 'Fetch daily exchange rates for the product price list';

    public function handle(PriceListService $priceList): int
    {
        $base = strtoupper(config('commerce.base_currency'));
        $targets = array_keys(config('commerce.fallback_rates'));
        $symbols = implode(',', array_map('strtoupper', $targets));

        try {
            $payload = Http::timeout(10)
                ->retry(3, 500)
                ->acceptJson()
                ->get(config('commerce.rate_source_url'), [
                    'base' => $base,
                    'symbols' => $symbols,
                ])
                ->throw()
                ->json();
        } catch (\Throwable $exception) {
            Log::error('Exchange rate refresh failed.', [
                'exception' => $exception->getMessage(),
            ]);

            $this->error('Could not fetch exchange rates: ' . $exception->getMessage());

            return self::FAILURE;
        }

        $fetched = [];

        foreach ($targets as $currency) {
            $value = (float) ($payload['rates'][strtoupper($currency)] ?? 0);

            if ($value <= 0) {
                Log::error('Exchange rate response is missing a currency.', [
                    'currency' => $currency,
                ]);

                $this->error("The response has no valid rate for {$currency}.");

                return self::FAILURE;
            }

            $fetched[$currency] = $value;
        }

        $current = $priceList->rates();
        $maxDeviation = (float) config('commerce.rate_max_deviation_percent');

        if (! $this->option('force')) {
            foreach ($fetched as $currency => $value) {
                $previous = $current[$currency] ?? 0;

                if ($previous > 0 && abs($value - $previous) / $previous * 100 > $maxDeviation) {
                    Log::critical('Exchange rate change exceeds the allowed deviation.', [
                        'currency' => $currency,
                        'previous' => $previous,
                        'fetched' => $value,
                    ]);

                    $this->error("Rate for {$currency} moved from {$previous} to {$value}. Use --force to accept it.");

                    return self::FAILURE;
                }
            }
        }

        $source = 'frankfurter:' . ($payload['date'] ?? 'unknown');
        $now = now();

        DB::table('exchange_rates')->upsert(
            collect($fetched)->map(fn ($rate, $currency) => [
                'currency' => $currency,
                'rate' => $rate,
                'source' => $source,
                'fetched_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ])->values()->all(),
            ['currency'],
            ['rate', 'source', 'fetched_at', 'updated_at']
        );

        PriceListService::flush();

        foreach ($fetched as $currency => $value) {
            $this->info(strtoupper($currency) . ': ' . $value);
        }

        return self::SUCCESS;
    }
}