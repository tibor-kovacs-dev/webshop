<?php

return [
    'image_base_url' => env(
        'CATALOG_IMAGE_BASE_URL',
        env('APP_URL', 'http://localhost')
    ),
];