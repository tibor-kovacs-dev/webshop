<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id(); // Alapértelmezett: unsignedBigInteger
            
            // ⭐️ JAVÍTÁS: A product_id a SMALLINT-hez illesztve
            $table->unsignedSmallInteger('product_id'); 
            
            // A user_id valószínűleg BIGINT (Laravel alapértelmezett id()), de ha hiba lenne,
            // ezt is a user tábla ID típusához kell igazítani (pl. unsignedInteger).
            $table->unsignedBigInteger('user_id'); 

            $table->unsignedTinyInteger('rating'); 
            $table->text('comment_text'); 
            
            $table->timestamps();
            
            // Kényszerek explicit hozzáadása
            $table->foreign('product_id')
                  ->references('id')->on('products')
                  ->onDelete('cascade');
                  
            $table->foreign('user_id')
                  ->references('id')->on('users')
                  ->onDelete('cascade');
            
            $table->unique(['product_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};