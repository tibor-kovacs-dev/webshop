<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Support\Money;

class OrderItem extends Model
{
    use HasFactory;

    protected $table = 'order_items';

    protected $fillable = [
        'order_id',
        'product_id',
        'quantity',
        'price',
        'price_minor',
    ];

    protected $casts = [
        'price_minor' => 'integer',
    ];

    public function priceMinor(): int
    {
        if ($this->price_minor !== null) {
            return (int) $this->price_minor;
        }

        return Money::decimalToMinor($this->getRawOriginal('price'));
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}