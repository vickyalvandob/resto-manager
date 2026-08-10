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
            ->has('categories', 1, fn (Assert $page) => $page
                ->where('id', $category->id)
                ->where('name', 'Coffee')
                ->where('products_count', 1)
                ->etc()
            )
            ->has('products', 1, fn (Assert $page) => $page
                ->where('id', $product->id)
                ->where('category.name', 'Coffee')
                ->where('name', 'Iced Latte')
                ->etc()
            )
        );
});

test('menu management uses alert dialogs and single create controls', function () {
    $menuPage = file_get_contents(resource_path('js/pages/products/index.tsx'));

    expect($menuPage)
        ->toContain("from '@/components/ui/alert-dialog'")
        ->not->toContain('window.confirm')
        ->not->toContain('window.alert');

    expect(substr_count($menuPage, 'href={newCategory()}'))->toBe(1)
        ->and(substr_count($menuPage, 'href={newProduct()}'))->toBe(1);
});

test('products page includes ordered products without pagination', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create(['name' => 'Coffee', 'sort_order' => 1]);

    $second = Product::factory()
        ->for($category)
        ->create(['name' => 'Second Drink', 'sort_order' => 2]);
    $first = Product::factory()
        ->for($category)
        ->create(['name' => 'First Drink', 'sort_order' => 1]);

    $response = $this
        ->actingAs($user)
        ->get(route('products.index'));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('products/index')
            ->has('products', 2)
            ->where('products.0.id', $first->id)
            ->where('products.1.id', $second->id)
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
    Product::factory()->for($category)->create(['sort_order' => 4]);
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
        ->and($product->sort_order)->toBe(5)
        ->and($product->is_active)->toBeTrue()
        ->and($product->image)->not->toBeNull();

    Storage::disk('public')->assertExists($product->image);
});

test('authenticated users can update products and replace images', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $oldCategory = Category::factory()->create();
    $newCategory = Category::factory()->create();
    Product::factory()->for($newCategory)->create(['sort_order' => 3]);
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
        ->and($product->sort_order)->toBe(4)
        ->and($product->is_active)->toBeFalse()
        ->and($product->image)->not->toBe('products/old-product.jpg');

    Storage::disk('public')->assertMissing('products/old-product.jpg');
    Storage::disk('public')->assertExists($product->image);
});

test('updated product images are exposed to menu management and pos', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $category = Category::factory()->create(['sort_order' => 1]);
    $product = Product::factory()
        ->for($category)
        ->create([
            'name' => 'Menu With Image',
            'image' => null,
            'is_active' => true,
            'is_available' => true,
        ]);

    $response = $this
        ->actingAs($user)
        ->post(route('products.update', $product), [
            '_method' => 'PUT',
            'name' => $product->name,
            'category_id' => $product->category_id,
            'description' => $product->description,
            'price' => $product->price,
            'image' => UploadedFile::fake()->image('menu-photo.jpg'),
            'is_available' => true,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    $product->refresh();
    $imageUrl = Storage::url($product->image);

    Storage::disk('public')->assertExists($product->image);

    $this
        ->actingAs($user)
        ->get(route('products.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('products.0.id', $product->id)
            ->where('products.0.image_url', $imageUrl)
        );

    $this
        ->actingAs($user)
        ->get(route('pos.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('products.0.id', $product->id)
            ->where('products.0.image_url', $imageUrl)
        );
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

test('authenticated users can reorder products within a category', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create();
    $otherCategory = Category::factory()->create();
    $first = Product::factory()->for($category)->create(['sort_order' => 1]);
    $second = Product::factory()->for($category)->create(['sort_order' => 2]);
    $third = Product::factory()->for($category)->create(['sort_order' => 3]);
    $otherProduct = Product::factory()->for($otherCategory)->create(['sort_order' => 9]);

    $response = $this
        ->actingAs($user)
        ->put(route('products.reorder'), [
            'category_id' => $category->id,
            'products' => [$third->id, $first->id, $second->id],
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('products.index'));

    expect($third->refresh()->sort_order)->toBe(1)
        ->and($first->refresh()->sort_order)->toBe(2)
        ->and($second->refresh()->sort_order)->toBe(3)
        ->and($otherProduct->refresh()->sort_order)->toBe(9);
});

test('product reorder requires exactly the selected category products', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create();
    $otherCategory = Category::factory()->create();
    $first = Product::factory()->for($category)->create(['sort_order' => 1]);
    $second = Product::factory()->for($category)->create(['sort_order' => 2]);
    $otherProduct = Product::factory()->for($otherCategory)->create(['sort_order' => 1]);

    $response = $this
        ->actingAs($user)
        ->put(route('products.reorder'), [
            'category_id' => $category->id,
            'products' => [$first->id, $first->id],
        ]);

    $response->assertSessionHasErrors(['products.1']);

    $response = $this
        ->actingAs($user)
        ->put(route('products.reorder'), [
            'category_id' => $category->id,
            'products' => [$second->id, $otherProduct->id],
        ]);

    $response->assertSessionHasErrors(['products']);
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
