<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Hozzáadjuk a locale mezőt 2 karakterrel és alapértelmezett angol értékkel
            $table->string('locale', 2)->default('en')->after('user_id'); 
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('locale');
        });
    }
};
