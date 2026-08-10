<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('admin can create a product', function () {
    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create(['name' => 'Ayam']);

    $response = $this
        ->actingAs($admin)
        ->post(route('products.store'), [
            'name' => 'Ayam Bakar',
            'category_id' => $category->id,
            'price' => 32000,
            'is_available' => true,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::where('name', 'Ayam Bakar')->firstOrFail();

    expect($product->price)->toBe(32000)
        ->and($product->is_available)->toBeTrue()
        ->and($product->sort_order)->toBe(1);
});

test('cashier cannot access admin product management', function () {
    $cashier = User::factory()->cashier()->create();

    $this
        ->actingAs($cashier)
        ->get(route('products.index'))
        ->assertForbidden();

    $this
        ->actingAs($cashier)
        ->get(route('reports.index'))
        ->assertForbidden();
});

test('pos only displays available products', function () {
    $cashier = User::factory()->cashier()->create();
    $available = Product::factory()->create(['name' => 'Ayam Bakar', 'is_available' => true, 'is_active' => true]);
    Product::factory()->unavailable()->create(['name' => 'Hidden Product']);

    $this
        ->actingAs($cashier)
        ->get(route('pos.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('pos/index')
            ->has('products', 1)
            ->where('products.0.id', $available->id)
            ->where('products.0.name', 'Ayam Bakar')
        );
});

test('pos page keeps menu and cart in compact scroll regions', function () {
    $posPage = file_get_contents(resource_path('js/pages/pos/index.tsx'));

    expect($posPage)
        ->toContain('h-[calc(100svh-4rem)]')
        ->toContain('grid-rows-[minmax(0,1fr)_minmax(0,0.9fr)]')
        ->toContain('lg:grid-cols-[minmax(0,1fr)_24rem]')
        ->toContain('overflow-y-auto')
        ->toContain('sm:grid-cols-3')
        ->toContain('xl:grid-cols-4')
        ->toContain('2xl:grid-cols-5');

    expect(substr_count($posPage, 'scroll-region=""'))->toBeGreaterThanOrEqual(2);
});

test('unavailable products cannot be checked out manually', function () {
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->unavailable()->create();

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasErrors(['items.0.product_id']);

    expect(Order::count())->toBe(0);
});

test('order can be created and recalculates database prices', function () {
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->create(['name' => 'Ayam Bakar', 'price' => 32000]);

    $response = $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'items' => [
                ['product_id' => $product->id, 'qty' => 2, 'note' => null, 'price' => 1],
            ],
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('pos.index'));

    $order = Order::with('items')->firstOrFail();

    expect($order->status)->toBe('open')
        ->and($order->grand_total)->toBe('64000.00')
        ->and($order->items)->toHaveCount(1)
        ->and($order->items->first()->product_name)->toBe('Ayam Bakar')
        ->and($order->items->first()->price)->toBe('32000.00');
});

test('multiple items produce correct subtotal and snapshots keep old price', function () {
    $cashier = User::factory()->cashier()->create();
    $ayam = Product::factory()->create(['name' => 'Ayam Bakar', 'price' => 32000]);
    $tea = Product::factory()->create(['name' => 'Es Teh', 'price' => 8000]);

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'items' => [
                ['product_id' => $ayam->id, 'qty' => 2],
                ['product_id' => $tea->id, 'qty' => 2],
            ],
        ])
        ->assertSessionHasNoErrors();

    $order = Order::with('items')->firstOrFail();

    $ayam->update(['price' => 99000]);

    expect($order->grand_total)->toBe('80000.00')
        ->and($order->items->firstWhere('product_id', $ayam->id)->price)->toBe('32000.00')
        ->and($order->items->firstWhere('product_id', $tea->id)->subtotal)->toBe('16000.00');
});

test('cash payment records change and rejects insufficient cash', function () {
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->create(['price' => 32000]);

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $product->id, 'qty' => 2],
            ],
        ])
        ->assertSessionHasNoErrors();

    $paidOrder = Order::firstOrFail();

    expect($paidOrder->status)->toBe('paid')
        ->and($paidOrder->payment_method)->toBe('cash')
        ->and($paidOrder->paid_amount)->toBe('100000.00')
        ->and($paidOrder->change_amount)->toBe('36000.00');

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'payment_method' => 'cash',
            'paid_amount' => 1000,
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasErrors(['paid_amount']);

    expect(Order::count())->toBe(1);
});

test('qris and transfer create paid orders', function (string $paymentMethod) {
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->create(['price' => 25000]);

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'take_away',
            'payment_method' => $paymentMethod,
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasNoErrors();

    $order = Order::firstOrFail();

    expect($order->status)->toBe('paid')
        ->and($order->payment_method)->toBe($paymentMethod)
        ->and($order->paid_amount)->toBe('25000.00')
        ->and($order->change_amount)->toBe('0.00');
})->with(['qris', 'transfer']);

test('open order can be paid later and paid order cannot be paid twice', function () {
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->create(['price' => 30000]);

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasNoErrors();

    $order = Order::firstOrFail();

    $this
        ->actingAs($cashier)
        ->post(route('orders.payments.store', $order), [
            'payment_method' => 'qris',
        ])
        ->assertSessionHasNoErrors();

    expect($order->refresh()->status)->toBe('paid')
        ->and($order->payment_method)->toBe('qris');

    $this
        ->actingAs($cashier)
        ->post(route('orders.payments.store', $order), [
            'payment_method' => 'transfer',
        ])
        ->assertSessionHasErrors(['payment_method']);

    expect($order->refresh()->payment_method)->toBe('qris');
});

test('open order can be voided and paid order cannot be voided', function () {
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->create(['price' => 30000]);

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasNoErrors();

    $openOrder = Order::firstOrFail();

    $this
        ->actingAs($cashier)
        ->post(route('orders.void.store', $openOrder), [
            'void_reason' => 'Customer cancelled',
        ])
        ->assertSessionHasNoErrors();

    expect($openOrder->refresh()->status)->toBe('void')
        ->and($openOrder->void_reason)->toBe('Customer cancelled');

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'payment_method' => 'qris',
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasNoErrors();

    $paidOrder = Order::latest('id')->firstOrFail();

    $this
        ->actingAs($cashier)
        ->post(route('orders.void.store', $paidOrder), [
            'void_reason' => 'Should fail',
        ])
        ->assertSessionHasErrors(['void_reason']);

    expect($paidOrder->refresh()->status)->toBe('paid');
});

test('open and void orders do not count as revenue', function () {
    $admin = User::factory()->admin()->create();
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->create(['price' => 20000]);

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'payment_method' => 'qris',
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ]);

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ]);

    $openOrder = Order::latest('id')->firstOrFail();

    $this
        ->actingAs($cashier)
        ->post(route('orders.void.store', $openOrder), [
            'void_reason' => 'Cancelled',
        ]);

    $this
        ->actingAs($admin)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('stats.revenue', 20000)
            ->where('stats.paid_transactions', 1)
            ->where('stats.void_orders', 1)
        );

    $this
        ->actingAs($admin)
        ->get(route('reports.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('summary.total_revenue', 20000)
            ->where('summary.total_paid_transactions', 1)
        );
});

test('invoice numbers are unique and reset sequence uses the day', function () {
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->create(['price' => 10000]);

    foreach ([1, 2] as $qty) {
        $this
            ->actingAs($cashier)
            ->post(route('pos.orders.store'), [
                'order_type' => 'dine_in',
                'items' => [
                    ['product_id' => $product->id, 'qty' => $qty],
                ],
            ])
            ->assertSessionHasNoErrors();
    }

    $orders = Order::query()->oldest('id')->get();
    $prefix = 'INV-'.now()->format('ymd');

    expect($orders)->toHaveCount(2)
        ->and($orders[0]->invoice_number)->toBe("{$prefix}-001")
        ->and($orders[1]->invoice_number)->toBe("{$prefix}-002")
        ->and($orders->pluck('invoice_number')->unique())->toHaveCount(2);
});
