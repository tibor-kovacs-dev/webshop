<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\User;
use App\Models\Product;
use App\Models\OrderItem;
use App\Support\Money;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'order_total',
        'order_total_minor',
        'shipping_details',
        'payment_method',
        'status',
        'payment_intent_id',
        'locale',
        'currency',
        'fx_quote_id',
    ];

    protected $attributes = [
        'status' => 'pending_payment',
    ];

    protected $casts = [
        'shipping_details' => 'array',
        'order_total' => 'float',
        'order_total_minor' => 'integer',
        'stock_reserved_until' => 'datetime',
        'payment_attempts' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function totalMinor(): int
    {
        if ($this->order_total_minor !== null) {
            return (int) $this->order_total_minor;
        }

        return Money::decimalToMinor($this->getRawOriginal('order_total'));
    }

    public function resolvedCurrency(): string
    {
        return strtolower($this->currency ?? ($this->locale === 'hu' ? 'huf' : 'eur'));
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'order_items')
            ->withPivot('quantity', 'price');
    }
}