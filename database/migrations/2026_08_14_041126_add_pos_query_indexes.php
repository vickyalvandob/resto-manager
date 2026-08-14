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
        Schema::table('products', function (Blueprint $table) {
            $table->index(['is_available', 'is_active', 'sort_order', 'name', 'id'], 'products_available_order_index');
            $table->index(['category_id', 'is_available', 'is_active'], 'products_category_available_index');
            $table->index(['category_id', 'sort_order'], 'products_category_sort_order_index');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->index('cashier_id', 'orders_cashier_id_index');
            $table->index(['status', 'paid_at'], 'orders_status_paid_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_status_paid_at_index');
            $table->dropIndex('orders_cashier_id_index');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_category_sort_order_index');
            $table->dropIndex('products_category_available_index');
            $table->dropIndex('products_available_order_index');
        });
    }
};
