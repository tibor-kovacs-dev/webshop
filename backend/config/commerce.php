<?php

return [
    'base_currency' => 'usd',

    'currencies' => ['usd', 'eur', 'huf'],

    'fallback_rates' => [
        'eur' => '0.85000000',
        'huf' => '328.00000000',
    ],

    'price_step' => [
        'usd' => '0.01',
        'eur' => '0.05',
        'huf' => '10.00',
    ],

    'rate_source_url' => env(
        'COMMERCE_RATE_SOURCE_URL',
        'https://api.frankfurter.dev/v1/latest'
    ),

    'rate_max_deviation_percent' => 15,
];
