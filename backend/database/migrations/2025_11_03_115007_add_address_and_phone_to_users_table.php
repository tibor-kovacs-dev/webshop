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
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('first_name');
            $table->dropColumn('name');

            $table->string('phone')->nullable();
            $table->string('zipcode')->nullable();
            $table->string('city')->nullable();
            $table->string('street')->nullable();
            $table->string('house_number')->nullable();
            $table->string('apartment')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable();

            $table->dropColumn([
                'first_name',
                'last_name',
                'phone',
                'zipcode',
                'city',
                'street',
                'house_number',
                'apartment',
            ]);
        });
    }
};
