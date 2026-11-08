<?php

namespace App\Support;

class Money
{
    public static function decimalToMinor(mixed $value): int
    {
        return (int) str_replace(
            '.',
            '',
            number_format((float) $value, 2, '.', '')
        );
    }
}