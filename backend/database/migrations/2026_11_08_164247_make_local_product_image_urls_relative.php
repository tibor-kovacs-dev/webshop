<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('products')
            ->orderBy('id')
            ->chunkById(200, function ($products) {
                foreach ($products as $product) {
                    $update = [];

                    $image = $this->relative($product->image);

                    if ($image !== $product->image) {
                        $update['image'] = $image;
                    }

                    if ($product->gallery_images !== null) {
                        $gallery = json_decode($product->gallery_images, true);

                        if (is_array($gallery)) {
                            $converted = array_map(
                                fn ($url) => is_string($url) ? $this->relative($url) : $url,
                                $gallery
                            );

                            if ($converted !== $gallery) {
                                $update['gallery_images'] = json_encode(
                                    $converted,
                                    JSON_UNESCAPED_SLASHES
                                );
                            }
                        }
                    }

                    if ($update !== []) {
                        DB::table('products')
                            ->where('id', $product->id)
                            ->update($update);
                    }
                }
            });
    }

    public function down(): void
    {
    }

    private function relative(?string $url): ?string
    {
        if ($url === null) {
            return null;
        }

        return preg_replace('#^https?://localhost(:\d+)?(?=/)#i', '', $url);
    }
};