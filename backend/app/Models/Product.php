<?php

namespace App\Models;

use App\Services\PriceListService;
use App\Support\ImageUrl;
use Illuminate\Database\Eloquent\Model;
use Spatie\Translatable\HasTranslations;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Product extends Model
{
    use HasTranslations;

    public $timestamps = false;

    protected $fillable = [
        'category',
        'name',
        'slug',
        'description',
        'image',
        'gallery_images',
        'price',
        'discount',
        'stock',
        'rating_rate',
        'rating_count'
    ];

    public array $translatable = ['description'];

    protected $hidden = [
        'rating_rate',
        'rating_count',
    ];

    protected $appends = [
        'rating',
        'gallery_images',
        'prices'
    ];

    protected function rating(): Attribute
    {
        return Attribute::make(
            get: fn($value, $attributes) => [
                'rate' => (float) ($attributes['rating_rate'] ?? 0),
                'count' => (int) ($attributes['rating_count'] ?? 0),
            ],
        );
    }

    protected function prices(): Attribute
    {
        return Attribute::make(
            get: fn ($value, $attributes) => app(PriceListService::class)->pricesFor(
                $attributes['price'] ?? 0,
                $attributes['discount'] ?? 0
            ),
        );
    }

    protected function image(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => ImageUrl::resolve($value),
        );
    }

    protected function galleryImages(): Attribute
    {
        return Attribute::make(
            get: fn ($value, $attributes) => ImageUrl::resolveMany(
                $attributes['gallery_images'] ?? null
            ),
        );
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function orders(): BelongsToMany
    {
        return $this->belongsToMany(Order::class, 'order_items')
            ->withPivot('quantity', 'price');
    }
}