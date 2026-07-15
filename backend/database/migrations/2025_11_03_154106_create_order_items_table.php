<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            // 1. Az order_id (valószínűleg BIGINT)
            $table->foreignId('order_id')
                ->constrained('orders')
                ->onDelete('cascade');

            // 2. A product_id (SMALLINT) manuális definíciója és a külső kulcs hozzáadása
            // EZ A KÉT RÉSZ EGYÜTT KELL, HOGY SZEREPELJEN, ÉS EGYIK SEM DUPLÁN!
            $table->unsignedSmallInteger('product_id');
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->onDelete('restrict');

            // 3. Pivot adatok
            $table->unsignedInteger('quantity');
            $table->decimal('price', 10, 2);

            // 4. Elsődleges kulcs
            $table->primary(['order_id', 'product_id']);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
