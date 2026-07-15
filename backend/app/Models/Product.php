<?php

namespace App\Models;

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
        'gallery_images'
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

    protected function image(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? (str_starts_with($value, 'http') ? $value : 'http://localhost:8000' . $value) : null,
        );
    }

    protected function galleryImages(): Attribute
    {
        return Attribute::make(
            get: function ($value, $attributes) {
                $raw = $attributes['gallery_images'] ?? null;
                
                if (!$raw) return [];

                $images = is_array($raw) ? $raw : json_decode($raw, true);

                if (!is_array($images)) return [];

                return array_map(function($url) {
                    return str_starts_with($url, 'http') ? $url : 'http://localhost:8000' . $url;
                }, $images);
            }
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