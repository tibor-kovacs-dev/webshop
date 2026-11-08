
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicates = DB::table('orders')
            ->select('payment_intent_id')
            ->selectRaw('COUNT(*) as duplicate_count')
            ->whereNotNull('payment_intent_id')
            ->groupBy('payment_intent_id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('payment_intent_id')
            ->all();

        if (! empty($duplicates)) {
            throw new RuntimeException(
                'Cannot add the unique payment_intent_id index. Duplicate values exist: ' .
                implode(', ', $duplicates)
            );
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->unique(
                'payment_intent_id',
                'orders_payment_intent_id_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique('orders_payment_intent_id_unique');
        });
    }
};
