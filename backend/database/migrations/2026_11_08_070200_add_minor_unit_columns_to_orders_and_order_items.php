<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('order_total_minor')
                ->nullable()
                ->after('order_total');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedBigInteger('price_minor')
                ->nullable()
                ->after('price');
        });

        DB::table('orders')
            ->orderBy('id')
            ->chunkById(500, function ($orders) {
                foreach ($orders as $order) {
                    DB::table('orders')
                        ->where('id', $order->id)
                        ->update([
                            'order_total_minor' => $this->toMinor($order->order_total),
                        ]);
                }
            });

        
        DB::table('order_items')
            ->orderBy('order_id')
            ->orderBy('product_id')
            ->chunk(500, function ($items) {
                foreach ($items as $item) {
                    DB::table('order_items')
                        ->where('order_id', $item->order_id)
                        ->where('product_id', $item->product_id)
                        ->update([
                            'price_minor' => $this->toMinor($item->price),
                        ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('price_minor');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('order_total_minor');
        });
    }

    private function toMinor(mixed $value): int
    {
        return (int) str_replace(
            '.',
            '',
            number_format((float) $value, 2, '.', '')
        );
    }
};