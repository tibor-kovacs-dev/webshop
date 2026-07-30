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

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'order_total',
        'shipping_details',
        'payment_method',
        'status',
        'payment_intent_id',
        'locale',
        'currency',
    ];

    protected $attributes = [
        'status' => 'pending_payment',
    ];

    protected $casts = [
        'shipping_details' => 'array',
        'order_total' => 'float',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function resolvedCurrency(): string
    {
        return $this->currency ?? ($this->locale === 'hu' ? 'huf' : 'eur');
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