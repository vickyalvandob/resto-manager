<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected from categories', function () {
    $response = $this->get(route('categories.index'));

    $response->assertRedirect(route('login'));
});

test('categories page is displayed', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create(['name' => 'Coffee']);

    Product::factory()->count(2)->for($category)->create();

    $response = $this
        ->actingAs($user)
        ->get(route('categories.index'));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('categories/index')
            ->where('categories.current_page', 1)
            ->where('categories.per_page', 10)
            ->where('categories.total', 1)
            ->has('categories.data', 1, fn (Assert $page) => $page
                ->where('id', $category->id)
                ->where('name', 'Coffee')
                ->where('products_count', 2)
                ->etc()
            )
        );
});

test('categories page is paginated', function () {
    $user = User::factory()->create();

    Category::factory()->count(12)->create();

    $response = $this
        ->actingAs($user)
        ->get(route('categories.index'));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('categories/index')
            ->where('categories.current_page', 1)
            ->where('categories.last_page', 2)
            ->where('categories.total', 12)
            ->has('categories.data', 10)
        );

    $response = $this
        ->actingAs($user)
        ->get(route('categories.index', ['page' => 2]));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('categories/index')
            ->where('categories.current_page', 2)
            ->where('categories.last_page', 2)
            ->where('categories.total', 12)
            ->has('categories.data', 2)
        );
});

test('create category page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('categories.create'));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('categories/create')
        );
});

test('edit category page is displayed', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create(['name' => 'Coffee']);

    Product::factory()->for($category)->create();

    $response = $this
        ->actingAs($user)
        ->get(route('categories.edit', $category));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('categories/edit')
            ->where('category.id', $category->id)
            ->where('category.name', 'Coffee')
            ->where('category.products_count', 1)
        );
});

test('authenticated users can create categories', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->post(route('categories.store'), [
            'name' => ' Signature Drinks ',
            'description' => 'Popular house specials.',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('categories.index'));

    $category = Category::where('name', 'Signature Drinks')->firstOrFail();

    expect($category->description)->toBe('Popular house specials.');
});

test('authenticated users can update categories', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create(['name' => 'Coffee']);

    $response = $this
        ->actingAs($user)
        ->put(route('categories.update', $category), [
            'name' => 'Espresso Bar',
            'description' => 'Coffee based drinks.',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('categories.index'));

    $category->refresh();

    expect($category->name)->toBe('Espresso Bar')
        ->and($category->description)->toBe('Coffee based drinks.');
});

test('authenticated users can delete empty categories', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('categories.destroy', $category));

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('categories.index'));

    $this->assertModelMissing($category);
});

test('authenticated users cannot delete categories that have products', function () {
    $user = User::factory()->create();
    $category = Category::factory()->create();
    $product = Product::factory()->for($category)->create();

    $response = $this
        ->actingAs($user)
        ->from(route('categories.index'))
        ->delete(route('categories.destroy', $category));

    $response->assertRedirect(route('categories.index'));

    $this->assertModelExists($category);
    $this->assertModelExists($product);
});

test('category validation requires unique category details', function () {
    $user = User::factory()->create();

    Category::factory()->create(['name' => 'Coffee']);

    $response = $this
        ->actingAs($user)
        ->post(route('categories.store'), [
            'name' => 'Coffee',
            'description' => str_repeat('A', 256),
        ]);

    $response->assertSessionHasErrors([
        'name',
        'description',
    ]);
});
