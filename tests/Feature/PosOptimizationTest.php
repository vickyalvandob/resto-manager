<?php

use App\Actions\Orders\CreateOrder;
use App\Actions\POS\GetAvailableMenu;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Closure;
use Illuminate\Cache\Repository as CacheRepository;
use Illuminate\Contracts\Cache\Lock as CacheLock;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;

test('database indexes support pos query patterns', function () {
    $productIndexes = collect(Schema::getIndexes('products'))->pluck('name');
    $orderIndexes = collect(Schema::getIndexes('orders'))->pluck('name');

    expect($productIndexes)
        ->toContain('products_available_order_index')
        ->toContain('products_category_available_index')
        ->toContain('products_category_sort_order_index');

    expect($orderIndexes)
        ->toContain('orders_cashier_id_index')
        ->toContain('orders_status_paid_at_index');
});

test('available menu payload is cached and invalidated when product availability changes', function () {
    Cache::flush();

    $cashier = User::factory()->cashier()->create();
    $category = Category::factory()->create(['name' => 'Makanan', 'sort_order' => 1]);
    $product = Product::factory()
        ->for($category)
        ->create([
            'name' => 'Nasi Goreng',
            'price' => 25000,
            'sort_order' => 1,
            'is_active' => true,
            'is_available' => true,
        ]);

    $this
        ->actingAs($cashier)
        ->get(route('pos.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('pos/index')
            ->has('categories', 1)
            ->has('products', 1)
            ->where('products.0.id', $product->id)
        );

    expect(Cache::has(GetAvailableMenu::CACHE_KEY))->toBeTrue()
        ->and(Cache::has(CacheRepository::FLEXIBLE_CREATED_KEY_PREFIX.GetAvailableMenu::CACHE_KEY))->toBeTrue();

    $product->update([
        'is_active' => false,
        'is_available' => false,
    ]);

    expect(Cache::has(GetAvailableMenu::CACHE_KEY))->toBeFalse()
        ->and(Cache::has(CacheRepository::FLEXIBLE_CREATED_KEY_PREFIX.GetAvailableMenu::CACHE_KEY))->toBeFalse();

    $this
        ->actingAs($cashier)
        ->get(route('pos.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('pos/index')
            ->has('categories', 0)
            ->has('products', 0)
        );
});

test('product reorder invalidates cached menu ordering', function () {
    Cache::flush();

    $admin = User::factory()->admin()->create();
    $category = Category::factory()->create(['sort_order' => 1]);
    $firstProduct = Product::factory()
        ->for($category)
        ->create(['name' => 'Produk Pertama', 'sort_order' => 1]);
    $secondProduct = Product::factory()
        ->for($category)
        ->create(['name' => 'Produk Kedua', 'sort_order' => 2]);

    $this
        ->actingAs($admin)
        ->get(route('pos.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('products.0.id', $firstProduct->id)
            ->where('products.1.id', $secondProduct->id)
        );

    expect(Cache::has(GetAvailableMenu::CACHE_KEY))->toBeTrue();

    $this
        ->actingAs($admin)
        ->put(route('products.reorder'), [
            'category_id' => $category->id,
            'products' => [$secondProduct->id, $firstProduct->id],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    expect(Cache::has(GetAvailableMenu::CACHE_KEY))->toBeFalse();

    $this
        ->actingAs($admin)
        ->get(route('pos.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('products.0.id', $secondProduct->id)
            ->where('products.1.id', $firstProduct->id)
        );
});

test('create order uses a daily atomic lock before assigning the queue number', function () {
    $cashier = User::factory()->cashier()->create();
    $product = Product::factory()->create(['price' => 15000]);
    $lock = Mockery::mock(CacheLock::class);

    Cache::shouldReceive('lock')
        ->once()
        ->withArgs(fn (string $key, int $seconds): bool => str_starts_with($key, 'orders:queue-number:')
            && $seconds === 10)
        ->andReturn($lock);

    $lock
        ->shouldReceive('block')
        ->once()
        ->withArgs(fn (int $seconds, Closure $callback): bool => $seconds === 5)
        ->andReturnUsing(fn (int $seconds, Closure $callback): Order => $callback());

    $order = app(CreateOrder::class)->handle($cashier, [
        'order_type' => 'dine_in',
        'items' => [
            ['product_id' => $product->id, 'qty' => 1],
        ],
    ]);

    expect($order->queue_number)->toBe(1)
        ->and($order->invoice_number)->toBe('INV-'.now()->format('ymd').'-001')
        ->and($order->grand_total)->toBe('15000.00');
});
