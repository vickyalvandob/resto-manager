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
        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->date('transaction_date')->index();
            $table->string('type')->index();
            $table->string('category', 50);
            $table->string('payment_method', 20);
            $table->unsignedBigInteger('amount');
            $table->string('description')->nullable();
            $table->timestamps();

            $table->index(['transaction_date', 'type'], 'cash_transactions_date_type_index');
            $table->index(['type', 'category'], 'cash_transactions_type_category_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_transactions');
    }
};
