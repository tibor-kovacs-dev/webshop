<?php
 
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
 
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // The actual currency the order was charged in (huf/eur), independent
            // of the UI locale. Nullable so existing rows aren't broken; the
            // application falls back to deriving it from `locale` when null.
            $table->string('currency', 3)->nullable()->after('locale');
        });
    }
 
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('currency');
        });
    }
};