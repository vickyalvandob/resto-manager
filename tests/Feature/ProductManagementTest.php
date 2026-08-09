<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected from products', function () {
    $response = $this->get(route('products.index'));

    $response->assertRedirect(route('login'));
});

test('products page is displayed', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create(['name' => 'Coffee']);
    $product = Product::factory()
        ->for($category)
        ->create(['name' => 'Iced Latte']);

    $response = $this
        ->actingAs($user)
        ->get(route('products.index'));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/index')
            ->where('products.current_page', 1)
            ->where('products.per_page', 10)
            ->where('products.total', 1)
            ->has('products.data', 1, fn (Assert $page) => $page
                ->where('id', $product->id)
                ->where('category.name', 'Coffee')
                ->where('name', 'Iced Latte')
                ->etc()
            )
        );
});

test('products page is paginated', function () {
    $user = User::factory()->create();

    Product::factory()->count(12)->create();

    $response = $this
        ->actingAs($user)
        ->get(route('products.index'));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/index')
            ->where('products.current_page', 1)
            ->where('products.last_page', 2)
            ->where('products.total', 12)
            ->has('products.data', 10)
        );

    $response = $this
        ->actingAs($user)
        ->get(route('products.index', ['page' => 2]));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/index')
            ->where('products.current_page', 2)
            ->where('products.last_page', 2)
            ->where('products.total', 12)
            ->has('products.data', 2)
        );
});

test('create product page is displayed', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create(['name' => 'Coffee']);

    $response = $this
        ->actingAs($user)
        ->get(route('products.create'));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/create')
            ->has('categories', 1, fn (Assert $page) => $page
                ->where('id', $category->id)
                ->where('name', 'Coffee')
                ->etc()
            )
        );
});

test('edit product page is displayed', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create(['name' => 'Coffee']);
    $product = Product::factory()
        ->for($category)
        ->create(['name' => 'Iced Latte']);

    $response = $this
        ->actingAs($user)
        ->get(route('products.edit', $product));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/edit')
            ->where('product.id', $product->id)
            ->where('product.name', 'Iced Latte')
            ->where('product.category.name', 'Coffee')
            ->has('categories', 1)
        );
});

test('authenticated users can create products with an existing category', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $category = Category::factory()->create(['name' => 'Signature Drinks']);
    $image = UploadedFile::fake()->image('kopi-susu.jpg');

    $response = $this
        ->actingAs($user)
        ->post(route('products.store'), [
            'name' => 'Kopi Susu',
            'category_id' => $category->id,
            'description' => 'House blend with milk.',
            'price' => 18000,
            'image' => $image,
            'is_active' => true,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product = Product::where('name', 'Kopi Susu')->firstOrFail();

    expect($product->category_id)->toBe($category->id)
        ->and($product->category->name)->toBe('Signature Drinks')
        ->and($product->price)->toBe(18000)
        ->and($product->is_active)->toBeTrue()
        ->and($product->image)->not->toBeNull();

    Storage::disk('public')->assertExists($product->image);
});

test('authenticated users can update products and replace images', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $oldCategory = Category::factory()->create();
    $newCategory = Category::factory()->create();
    $product = Product::factory()
        ->for($oldCategory)
        ->create([
            'name' => 'Old Product',
            'image' => 'products/old-product.jpg',
            'is_active' => true,
        ]);

    Storage::disk('public')->put('products/old-product.jpg', 'old');

    $response = $this
        ->actingAs($user)
        ->post(route('products.update', $product), [
            '_method' => 'PUT',
            'name' => 'Updated Product',
            'category_id' => $newCategory->id,
            'description' => 'Updated description.',
            'price' => 32000,
            'image' => UploadedFile::fake()->image('updated-product.png'),
            'is_active' => false,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product->refresh();

    expect($product->name)->toBe('Updated Product')
        ->and($product->category_id)->toBe($newCategory->id)
        ->and($product->price)->toBe(32000)
        ->and($product->is_active)->toBeFalse()
        ->and($product->image)->not->toBe('products/old-product.jpg');

    Storage::disk('public')->assertMissing('products/old-product.jpg');
    Storage::disk('public')->assertExists($product->image);
});

test('authenticated users can remove product images', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $product = Product::factory()->create([
        'image' => 'products/remove-me.jpg',
    ]);

    Storage::disk('public')->put('products/remove-me.jpg', 'image');

    $response = $this
        ->actingAs($user)
        ->post(route('products.update', $product), [
            '_method' => 'PUT',
            'name' => $product->name,
            'category_id' => $product->category_id,
            'description' => $product->description,
            'price' => $product->price,
            'remove_image' => true,
            'is_active' => $product->is_active,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    expect($product->refresh()->image)->toBeNull();

    Storage::disk('public')->assertMissing('products/remove-me.jpg');
});

test('authenticated users can delete products', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $product = Product::factory()->create([
        'image' => 'products/delete-me.jpg',
    ]);

    Storage::disk('public')->put('products/delete-me.jpg', 'image');

    $response = $this
        ->actingAs($user)
        ->delete(route('products.destroy', $product));

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $this->assertModelMissing($product);
    Storage::disk('public')->assertMissing('products/delete-me.jpg');
});

test('product validation requires product details', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('products.store'), [
            'name' => '',
            'price' => -1,
        ]);

    $response->assertSessionHasErrors([
        'name',
        'category_id',
        'price',
    ]);
});
