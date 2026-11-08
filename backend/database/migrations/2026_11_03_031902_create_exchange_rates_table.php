<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('exchange_rates')) {
            Schema::create('exchange_rates', function (Blueprint $table) {
                $table->string('currency', 3)->primary();
                $table->decimal('rate', 18, 8);
                $table->string('source')->nullable();
                $table->timestamp('fetched_at')->nullable();
                $table->timestamps();
            });
        }

        $now = now();

        DB::table('exchange_rates')->insertOrIgnore([
            [
                'currency' => 'eur',
                'rate' => 0.85,
                'source' => 'fallback',
                'fetched_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'currency' => 'huf',
                'rate' => 328,
                'source' => 'fallback',
                'fetched_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('exchange_rates');
    }
};