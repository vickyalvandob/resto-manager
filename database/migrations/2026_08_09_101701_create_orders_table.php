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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('queue_number');
            $table->string('invoice_number')->unique();
            $table->string('customer_name')->nullable();
            $table->string('order_type');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('grand_total', 12, 2);
            $table->string('payment_method')->nullable();
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('change_amount', 12, 2)->default(0);
            $table->string('status')->default('open')->index();
            $table->foreignId('cashier_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('paid_at')->nullable()->index();
            $table->timestamp('voided_at')->nullable()->index();
            $table->text('void_reason')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['created_at', 'queue_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
