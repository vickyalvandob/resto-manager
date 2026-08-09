<?php

use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Orders\OrderController;
use App\Http\Controllers\Orders\PaymentController;
use App\Http\Controllers\Orders\ReceiptController;
use App\Http\Controllers\Orders\VoidOrderController;
use App\Http\Controllers\POS\CheckoutController;
use App\Http\Controllers\POS\PosController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::middleware('role:admin')->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');

        Route::put('categories/reorder', [CategoryController::class, 'reorder'])->name('categories.reorder');
        Route::resource('categories', CategoryController::class)->only(['index', 'create', 'store', 'edit', 'update', 'destroy']);

        Route::put('products/{product}/availability', [ProductController::class, 'toggleAvailability'])->name('products.availability');
        Route::resource('products', ProductController::class)->only(['index', 'create', 'store', 'edit', 'update', 'destroy']);

        Route::get('reports', ReportController::class)->name('reports.index');
        Route::get('settings', [SettingController::class, 'index'])->name('settings.index');
        Route::put('settings', [SettingController::class, 'update'])->name('settings.update');
    });

    Route::middleware('role:admin,cashier')->group(function () {
        Route::get('pos', PosController::class)->name('pos.index');
        Route::post('pos/orders', [CheckoutController::class, 'store'])->name('pos.orders.store');

        Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
        Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
        Route::post('orders/{order}/payments', [PaymentController::class, 'store'])->name('orders.payments.store');
        Route::post('orders/{order}/void', [VoidOrderController::class, 'store'])->name('orders.void.store');
        Route::get('orders/{order}/receipt', [ReceiptController::class, 'show'])->name('orders.receipt');
    });
});

require __DIR__.'/settings.php';
