<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OverflowException;

class PriceListService
{
    private const RATE_SCALE = 100000000;

    private const RATE_DECIMALS = 8;

    private const MONEY_DECIMALS = 2;

    private const DISCOUNT_SCALE = 10000;

    private static ?array $rates = null;

    private static int $loadedAt = 0;

    public static function flush(): void
    {
        self::$rates = null;
        self::$loadedAt = 0;
    }

    public function currencies(): array
    {
        return array_map(
            'strtolower',
            config('commerce.currencies', [])
        );
    }

    public function supports(string $currency): bool
    {
        return in_array(
            strtolower($currency),
            $this->currencies(),
            true
        );
    }

    /**
     * Returns exchange rates as floats for backward compatibility.
     *
     * Internal pricing calculations use the original decimal strings.
     */
    public function rates(): array
    {
        $rates = $this->rateDecimals();

        return array_map(
            static fn (string $rate): float => (float) $rate,
            $rates
        );
    }

    /**
     * Returns the exchange rate as a float for backward compatibility.
     */
    public function rate(string $currency): float
    {
        $currency = strtolower($currency);

        if (! $this->supports($currency)) {
            throw ValidationException::withMessages([
                'currency' => 'Unsupported currency.',
            ]);
        }

        if ($currency === strtolower(config('commerce.base_currency'))) {
            return 1.0;
        }

        $rates = $this->rateDecimals();

        if (! isset($rates[$currency])) {
            throw ValidationException::withMessages([
                'currency' => 'Unsupported currency.',
            ]);
        }

        return (float) $rates[$currency];
    }

    /**
     * Returns the smallest price step in minor units.
     *
     * USD: 1
     * EUR: 5
     * HUF: 1000
     */
    public function stepMinor(string $currency): int
    {
        $currency = strtolower($currency);

        if (! $this->supports($currency)) {
            throw ValidationException::withMessages([
                'currency' => 'Unsupported currency.',
            ]);
        }

        $step = config(
            'commerce.price_step.' . $currency,
            '0.01'
        );

        $stepMinor = $this->decimalToScaledInt(
            $step,
            self::MONEY_DECIMALS
        );

        if ($stepMinor < 1) {
            throw new OverflowException(
                "Invalid price step for currency {$currency}."
            );
        }

        return $stepMinor;
    }

    /**
     * Calculates the list price in integer minor units.
     */
    public function listMinor(
        int|float|string $usdPrice,
        string $currency
    ): int {
        $currency = strtolower($currency);

        if (! $this->supports($currency)) {
            throw ValidationException::withMessages([
                'currency' => 'Unsupported currency.',
            ]);
        }

        $usdMinor = $this->decimalToScaledInt(
            $usdPrice,
            self::MONEY_DECIMALS
        );

        if ($usdMinor < 0) {
            throw ValidationException::withMessages([
                'price' => 'The product price cannot be negative.',
            ]);
        }

        $rateScaled = $this->rateScaled($currency);
        $step = $this->stepMinor($currency);

        return $this->roundRatioToStep(
            $usdMinor,
            $rateScaled,
            self::RATE_SCALE,
            $step
        );
    }

    /**
     * Calculates the discounted price in integer minor units.
     *
     * Discount precision: two decimal places.
     * Example: 10.00% = 1000 basis points.
     */
    public function finalMinor(
        int|float|string $usdPrice,
        int|float|string $discount,
        string $currency
    ): int {
        $listMinor = $this->listMinor($usdPrice, $currency);

        $discountBps = $this->decimalToScaledInt(
            $discount,
            2
        );

        $discountBps = min(
            self::DISCOUNT_SCALE,
            max(0, $discountBps)
        );

        if ($discountBps === 0) {
            return $listMinor;
        }

        if ($discountBps === self::DISCOUNT_SCALE) {
            return 0;
        }

        $step = $this->stepMinor($currency);

        return $this->roundRatioToStep(
            $listMinor,
            self::DISCOUNT_SCALE - $discountBps,
            self::DISCOUNT_SCALE,
            $step
        );
    }

    /**
     * Returns both display prices and integer minor-unit prices.
     */
    public function pricesFor(
        int|float|string $usdPrice,
        int|float|string $discount
    ): array {
        $prices = [];

        foreach ($this->currencies() as $currency) {
            $listMinor = $this->listMinor(
                $usdPrice,
                $currency
            );

            $finalMinor = $this->finalMinor(
                $usdPrice,
                $discount,
                $currency
            );

            $prices[$currency] = [
                'list' => $listMinor / 100,
                'final' => $finalMinor / 100,
                'list_minor' => $listMinor,
                'final_minor' => $finalMinor,
            ];
        }

        return $prices;
    }

    /**
     * Loads and caches exchange rates as decimal strings.
     */
    private function rateDecimals(): array
    {
        if (
            self::$rates !== null &&
            time() - self::$loadedAt < 60
        ) {
            return self::$rates;
        }

        $stored = DB::table('exchange_rates')
            ->pluck('rate', 'currency')
            ->all();

        $rates = [];

        foreach (
            config('commerce.fallback_rates', [])
            as $currency => $fallback
        ) {
            $value = $stored[$currency] ?? null;

            $value = $value !== null
                ? (string) $value
                : (string) $fallback;

            $scaled = $this->decimalToScaledInt(
                $value,
                self::RATE_DECIMALS
            );

            if ($scaled <= 0) {
                $value = (string) $fallback;

                $scaled = $this->decimalToScaledInt(
                    $value,
                    self::RATE_DECIMALS
                );
            }

            if ($scaled <= 0) {
                throw new OverflowException(
                    "Invalid exchange rate for {$currency}."
                );
            }

            $rates[strtolower($currency)] = $value;
        }

        self::$rates = $rates;
        self::$loadedAt = time();

        return $rates;
    }

    /**
     * Returns the exchange rate scaled to eight decimal places.
     */
    private function rateScaled(string $currency): int
    {
        $currency = strtolower($currency);

        if ($currency === strtolower(config('commerce.base_currency'))) {
            return self::RATE_SCALE;
        }

        $rates = $this->rateDecimals();

        if (! isset($rates[$currency])) {
            throw ValidationException::withMessages([
                'currency' => 'Unsupported currency.',
            ]);
        }

        return $this->decimalToScaledInt(
            $rates[$currency],
            self::RATE_DECIMALS
        );
    }

    /**
     * Converts a decimal value to an integer with the requested scale.
     *
     * Examples:
     * 800.00 with 2 decimals -> 80000
     * 0.85 with 8 decimals -> 85000000
     * 10.00 with 2 decimals -> 1000
     */
    private function decimalToScaledInt(
        int|float|string $value,
        int $decimals
    ): int {
        $value = trim((string) $value);

        if (! preg_match(
            '/^([+-]?)(\d+)(?:\.(\d*))?$/',
            $value,
            $matches
        )) {
            throw new OverflowException(
                'Invalid decimal value.'
            );
        }

        $negative = ($matches[1] ?? '') === '-';
        $whole = $matches[2];
        $fraction = $matches[3] ?? '';

        $factor = 10 ** $decimals;

        if (strlen($whole) > 15) {
            throw new OverflowException(
                'Decimal value exceeds the supported range.'
            );
        }

        $wholeValue = (int) $whole;

        if ($wholeValue > intdiv(PHP_INT_MAX, $factor)) {
            throw new OverflowException(
                'Decimal value exceeds the supported range.'
            );
        }

        $fraction = str_pad(
            $fraction,
            $decimals,
            '0'
        );

        $keptFraction = substr(
            $fraction,
            0,
            $decimals
        );

        $fractionValue = $keptFraction === ''
            ? 0
            : (int) $keptFraction;

        $result = $wholeValue * $factor + $fractionValue;

        $extraDigits = substr(
            $fraction,
            $decimals
        );

        if (
            $extraDigits !== '' &&
            (int) $extraDigits[0] >= 5
        ) {
            if ($result === PHP_INT_MAX) {
                throw new OverflowException(
                    'Decimal value exceeds the supported range.'
                );
            }

            $result++;
        }

        return $negative ? -$result : $result;
    }

    /**
     * Calculates:
     *
     * round(amount * numerator / (denominator * step)) * step
     *
     * Uses integer arithmetic and reduces the fraction before
     * multiplication to minimize overflow risk.
     */
    private function roundRatioToStep(
        int $amount,
        int $numerator,
        int $denominator,
        int $step
    ): int {
        if (
            $amount < 0 ||
            $numerator < 0 ||
            $denominator <= 0 ||
            $step <= 0
        ) {
            throw new OverflowException(
                'Invalid values for monetary calculation.'
            );
        }

        if ($amount === 0 || $numerator === 0) {
            return 0;
        }

        $targetDenominator = $this->safeMultiply(
            $denominator,
            $step
        );

        $gcd = $this->greatestCommonDivisor(
            $amount,
            $targetDenominator
        );

        $amount = intdiv($amount, $gcd);
        $targetDenominator = intdiv(
            $targetDenominator,
            $gcd
        );

        $gcd = $this->greatestCommonDivisor(
            $numerator,
            $targetDenominator
        );

        $numerator = intdiv($numerator, $gcd);
        $targetDenominator = intdiv(
            $targetDenominator,
            $gcd
        );

        $product = $this->safeMultiply(
            $amount,
            $numerator
        );

        $units = intdiv(
            $product,
            $targetDenominator
        );

        $remainder = $product % $targetDenominator;

        $roundingThreshold = intdiv(
            $targetDenominator,
            2
        ) + ($targetDenominator % 2);

        if ($remainder >= $roundingThreshold) {
            $units++;
        }

        return $this->safeMultiply(
            $units,
            $step
        );
    }

    private function greatestCommonDivisor(
        int $a,
        int $b
    ): int {
        while ($b !== 0) {
            $remainder = $a % $b;
            $a = $b;
            $b = $remainder;
        }

        return max(1, $a);
    }

    private function safeMultiply(
        int $a,
        int $b
    ): int {
        if ($a === 0 || $b === 0) {
            return 0;
        }

        if ($a > intdiv(PHP_INT_MAX, $b)) {
            throw new OverflowException(
                'Monetary calculation exceeds the supported integer range.'
            );
        }

        return $a * $b;
    }
}
