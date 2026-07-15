<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany; // ⬅️ KRITIKUS JAVÍTÁS (1)
use App\Models\User;
use App\Models\Product;
use App\Models\OrderItem; // ⬅️ KRITIKUS JAVÍTÁS (2)

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
        'locale'
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