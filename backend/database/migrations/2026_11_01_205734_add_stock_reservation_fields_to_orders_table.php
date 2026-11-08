<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('stock_status', 20)
                ->default('none')
                ->after('status');

            $table->timestamp('stock_reserved_until')
                ->nullable()
                ->after('stock_status');

            $table->unsignedSmallInteger('payment_attempts')
                ->default(0)
                ->after('payment_intent_id');

            $table->string('checkout_token', 64)
                ->nullable()
                ->unique()
                ->after('payment_attempts');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'stock_status',
                'stock_reserved_until',
                'payment_attempts',
                'checkout_token',
            ]);
        });
    }
};