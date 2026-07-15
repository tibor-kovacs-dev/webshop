<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. LÉPÉS: Oszlop méretének növelése MEDIUMTEXT-re, hogy elférjen a JSON
        Schema::table('products', function (Blueprint $table) {
            // A MEDIUMTEXT maximum 16 MB adatot képes tárolni, ami bőven elég a leírásokhoz.
            $table->mediumText('description')->change(); 
        });

        DB::statement('UPDATE products SET description = JSON_OBJECT("en", description) WHERE JSON_VALID(description) = 0;');

        Schema::table('products', function (Blueprint $table) {
            $table->json('description')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            DB::statement("UPDATE products SET description = description->>'$.hu' WHERE JSON_VALID(description) = 1;");
            $table->text('description')->change();
        });
    }
};
