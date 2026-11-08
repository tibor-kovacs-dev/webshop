<?php

namespace App\Support;

class ImageUrl
{
    public static function resolve(mixed $path): ?string
    {
        if (! is_string($path)) {
            return null;
        }

        $path = trim($path);

        if ($path === '') {
            return null;
        }

        if (preg_match('#^https?://#i', $path) === 1) {
            return $path;
        }

        if (str_starts_with($path, '//')) {
            return 'https:' . $path;
        }

        $base = rtrim((string) config('catalog.image_base_url'), '/');

        return $base . '/' . ltrim($path, '/');
    }

    public static function resolveMany(mixed $paths): array
    {
        if (is_string($paths)) {
            $paths = json_decode($paths, true);
        }

        if (! is_array($paths)) {
            return [];
        }

        return array_values(array_filter(
            array_map(fn ($path) => self::resolve($path), $paths)
        ));
    }
}