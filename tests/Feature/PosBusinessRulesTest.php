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

test('open order detail includes available products for adding items', function () {
    $cashier = User::factory()->cashier()->create();
    $available = Product::factory()->create(['name' => 'Ayam Bakar', 'is_available' => true, 'is_active' => true]);
    Product::factory()->unavailable()->create(['name' => 'Hidden Product']);

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'items' => [
                ['product_id' => $available->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasNoErrors();

    $order = Order::firstOrFail();

    $this
        ->actingAs($cashier)
        ->get(route('orders.show', $order))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('orders/show')
            ->where('order.id', $order->id)
            ->has('products', 1)
            ->where('products.0.id', $available->id)
        );
});

test('orders index includes summary and keeps status filtering separate', function () {
    $cashier = User::factory()->cashier()->create();

    Order::query()->create([
        'queue_number' => 1,
        'invoice_number' => 'INV-INDEX-001',
        'customer_name' => 'Ana',
        'order_type' => 'dine_in',
        'subtotal' => 25000,
        'grand_total' => 25000,
        'status' => 'open',
        'cashier_id' => $cashier->id,
    ]);

    Order::query()->create([
        'queue_number' => 2,
        'invoice_number' => 'INV-INDEX-002',
        'customer_name' => 'Budi',
        'order_type' => 'take_away',
        'subtotal' => 50000,
        'grand_total' => 50000,
        'payment_method' => 'qris',
        'paid_amount' => 50000,
        'status' => 'paid',
        'cashier_id' => $cashier->id,
        'paid_at' => now(),
    ]);

    $voidOrder = Order::query()->create([
        'queue_number' => 3,
        'invoice_number' => 'INV-INDEX-003',
        'customer_name' => 'Citra',
        'order_type' => 'dine_in',
        'subtotal' => 15000,
        'grand_total' => 15000,
        'status' => 'void',
        'cashier_id' => $cashier->id,
        'void_reason' => 'Cancelled',
    ]);

    $voidOrder
        ->forceFill([
            'created_at' => now()->subDay(),
            'updated_at' => now()->subDay(),
            'voided_at' => now()->subDay(),
        ])
        ->save();

    $this
        ->actingAs($cashier)
        ->get(route('orders.index', ['date' => 'today']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('orders/index')
            ->where('filters.date', 'today')
            ->where('filters.status', '')
            ->where('summary.total_orders', 2)
            ->where('summary.open_orders', 1)
            ->where('summary.paid_orders', 1)
            ->where('summary.void_orders', 0)
            ->where('summary.paid_revenue', 50000)
            ->has('orders.data', 2)
            ->etc()
        );

    $this
        ->actingAs($cashier)
        ->get(route('orders.index', [
            'date' => 'all',
            'status' => 'paid',
            'search' => 'INV-INDEX',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.date', 'all')
            ->where('filters.status', 'paid')
            ->where('filters.search', 'INV-INDEX')
            ->where('summary.total_orders', 3)
            ->where('summary.open_orders', 1)
            ->where('summary.paid_orders', 1)
            ->where('summary.void_orders', 1)
            ->where('orders.total', 1)
            ->where('orders.data.0.invoice_number', 'INV-INDEX-002')
            ->etc()
        );
});

test('pos page keeps menu and cart in compact scroll regions', function () {
    $posPage = file_get_contents(resource_path('js/pages/pos/index.tsx'));

    expect($posPage)
        ->toContain('h-[calc(100svh-4rem)]')
        ->toContain('grid-rows-[minmax(0,1fr)_minmax(0,0.9fr)]')
        ->toContain('lg:grid-cols-[minmax(0,1fr)_24rem]')
        ->toContain('overflow-y-auto')
        ->toContain('grid min-h-0 flex-1 auto-rows-min grid-cols-1 content-start gap-2 overflow-y-auto p-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5')
        ->toContain('group relative grid min-h-[4.5rem] grid-cols-[3.5rem_minmax(0,1fr)] gap-2 overflow-hidden rounded-lg border bg-background p-2')
        ->toContain('size-14 shrink-0 overflow-hidden rounded-md bg-muted')
        ->toContain('hidden truncate text-xs text-muted-foreground sm:block')
        ->toContain('hidden size-7 shrink-0 items-center justify-center rounded-md bg-primary')
        ->toContain('sm:grid-cols-3')
        ->toContain('xl:grid-cols-4')
        ->toContain('2xl:grid-cols-5')
        ->toContain('className="grid shrink-0 gap-2 border-b p-2 sm:p-3"')
        ->toContain("type CheckoutMode = 'save' | 'pay'")
        ->toContain('id="customer_name"')
        ->toContain("openCheckout('save')")
        ->toContain("openCheckout('pay')");

    expect($posPage)
        ->not->toContain('id="pos_customer_name"')
        ->not->toContain('<h1 className="text-xl font-semibold">POS</h1>')
        ->not->toContain('<h2 className="truncate font-semibold">Menu</h2>')
        ->not->toContain('{filteredProducts.length} hasil')
        ->not->toContain('grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-2 sm:grid-cols-3')
        ->not->toContain('flex min-h-24 flex-row')
        ->not->toContain('h-24 w-28 shrink-0')
        ->not->toContain('xl:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1fr)]')
        ->not->toContain('className="grid shrink-0 gap-2 rounded-lg border bg-background p-2 sm:p-3"');

    $categoryFilterPosition = strpos($posPage, 'className="flex gap-2 overflow-x-auto pb-1"');
    $searchInputPosition = strpos($posPage, 'placeholder="Cari produk atau kategori"');

    expect($categoryFilterPosition)
        ->not->toBeFalse()
        ->toBeLessThan($searchInputPosition);

    expect(substr_count($posPage, 'scroll-region=""'))->toBeGreaterThanOrEqual(2);
});

test('order detail actions close dialogs and avoid duplicated overview cards', function () {
    $orderPage = file_get_contents(resource_path('js/pages/orders/show.tsx'));
    $addItemsSubmit = str($orderPage)->between('function submitAddItems(): void', 'function submitPayment(): void')->toString();
    $paymentSubmit = str($orderPage)->between('function submitPayment(): void', 'function submitVoid(): void')->toString();
    $voidSubmit = str($orderPage)->after('function submitVoid(): void')->toString();

    expect($addItemsSubmit)
        ->toContain('addOrderItems(order.id)')
        ->toContain('setAddItemsOpen(false);')
        ->toContain('resetAddItems();');

    expect($paymentSubmit)
        ->toContain('onSuccess: () => {')
        ->toContain('setPaymentOpen(false);')
        ->toContain("setPaidAmount('');")
        ->toContain('setPaymentErrors({});');

    expect($voidSubmit)
        ->toContain('onSuccess: () => {')
        ->toContain('setVoidOpen(false);')
        ->toContain("setVoidReason('');")
        ->toContain('setVoidErrors({});');

    expect($orderPage)
        ->toContain('Tambah Pesanan')
        ->toContain('filteredProducts.map')
        ->toContain('Tambah ke Order')
        ->toContain('quickCashAmounts(order.grand_total)')
        ->toContain('paymentOptions.map')
        ->toContain('Metode pembayaran')
        ->toContain('Konfirmasi Pembayaran')
        ->not->toContain('OverviewCard')
        ->not->toContain('grid gap-3 sm:grid-cols-2 xl:grid-cols-4');
});

test('orders index page exposes operational summary filters and mobile cards', function () {
    $orderIndexPage = file_get_contents(resource_path('js/pages/orders/index.tsx'));

    expect($orderIndexPage)
        ->toContain('type OrderSummary =')
        ->toContain('Total Order')
        ->toContain('Omzet Paid')
        ->toContain('dateFilterOptions')
        ->toContain('StatusFilterButton')
        ->toContain('OrderCard')
        ->toContain('lg:hidden')
        ->toContain('hidden overflow-x-auto lg:block')
        ->toContain('receiptOrder.url(order.id)')
        ->toContain('prefetch');
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

test('open order can have items added later and totals use database prices', function () {
    $cashier = User::factory()->cashier()->create();
    $rice = Product::factory()->create(['name' => 'Nasi Goreng', 'price' => 30000]);
    $tea = Product::factory()->create(['name' => 'Es Teh', 'price' => 9000]);

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'items' => [
                ['product_id' => $rice->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasNoErrors();

    $order = Order::with('items')->firstOrFail();

    $response = $this
        ->actingAs($cashier)
        ->post(route('orders.items.store', $order), [
            'items' => [
                ['product_id' => $tea->id, 'qty' => 2, 'note' => 'Less ice'],
            ],
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('orders.show', $order));

    $order->refresh()->load('items');
    $addedItem = $order->items->firstWhere('product_id', $tea->id);

    expect($order->status)->toBe('open')
        ->and($order->items)->toHaveCount(2)
        ->and($order->grand_total)->toBe('48000.00')
        ->and($addedItem->product_name)->toBe('Es Teh')
        ->and($addedItem->price)->toBe('9000.00')
        ->and($addedItem->qty)->toBe(2)
        ->and($addedItem->subtotal)->toBe('18000.00')
        ->and($addedItem->note)->toBe('Less ice');
});

test('unavailable products cannot be added to open orders', function () {
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->create(['price' => 30000]);
    $unavailable = Product::factory()->unavailable()->create(['price' => 9000]);

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasNoErrors();

    $order = Order::with('items')->firstOrFail();

    $this
        ->actingAs($cashier)
        ->post(route('orders.items.store', $order), [
            'items' => [
                ['product_id' => $unavailable->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasErrors(['items.0.product_id']);

    $order->refresh()->load('items');

    expect($order->items)->toHaveCount(1)
        ->and($order->grand_total)->toBe('30000.00');
});

test('paid and void orders cannot have items added', function () {
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->create(['price' => 30000]);
    $extra = Product::factory()->create(['price' => 9000]);

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

    $paidOrder = Order::firstOrFail();

    $this
        ->actingAs($cashier)
        ->post(route('orders.items.store', $paidOrder), [
            'items' => [
                ['product_id' => $extra->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasErrors(['items']);

    $this
        ->actingAs($cashier)
        ->post(route('pos.orders.store'), [
            'order_type' => 'dine_in',
            'items' => [
                ['product_id' => $product->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasNoErrors();

    $voidOrder = Order::latest('id')->firstOrFail();

    $this
        ->actingAs($cashier)
        ->post(route('orders.void.store', $voidOrder), [
            'void_reason' => 'Customer cancelled',
        ])
        ->assertSessionHasNoErrors();

    $this
        ->actingAs($cashier)
        ->post(route('orders.items.store', $voidOrder), [
            'items' => [
                ['product_id' => $extra->id, 'qty' => 1],
            ],
        ])
        ->assertSessionHasErrors(['items']);

    expect($paidOrder->refresh()->items)->toHaveCount(1)
        ->and($voidOrder->refresh()->items)->toHaveCount(1);
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
