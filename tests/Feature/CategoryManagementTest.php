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
    $category = Category::factory()->create(['name' => 'Coffee', 'sort_order' => 1]);

    Product::factory()->count(2)->for($category)->create();

    $response = $this
        ->actingAs($user)
        ->get(route('categories.index'));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('categories/index')
            ->has('categories', 1, fn (Assert $page) => $page
                ->where('id', $category->id)
                ->where('name', 'Coffee')
                ->where('sort_order', 1)
                ->where('products_count', 2)
                ->etc()
            )
        );
});

test('categories page is ordered by sort order without pagination', function () {
    $user = User::factory()->create();

    $third = Category::factory()->create(['name' => 'Third', 'sort_order' => 3]);
    $first = Category::factory()->create(['name' => 'First', 'sort_order' => 1]);
    $second = Category::factory()->create(['name' => 'Second', 'sort_order' => 2]);

    $response = $this
        ->actingAs($user)
        ->get(route('categories.index'));

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('categories/index')
            ->has('categories', 3)
            ->where('categories.0.id', $first->id)
            ->where('categories.1.id', $second->id)
            ->where('categories.2.id', $third->id)
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

    expect($category->description)->toBe('Popular house specials.')
        ->and($category->sort_order)->toBe(1);
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

test('authenticated users can reorder categories', function () {
    $user = User::factory()->create();
    $first = Category::factory()->create(['sort_order' => 1]);
    $second = Category::factory()->create(['sort_order' => 2]);
    $third = Category::factory()->create(['sort_order' => 3]);

    $response = $this
        ->actingAs($user)
        ->put(route('categories.reorder'), [
            'categories' => [$third->id, $first->id, $second->id],
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('categories.index'));

    expect($third->refresh()->sort_order)->toBe(1)
        ->and($first->refresh()->sort_order)->toBe(2)
        ->and($second->refresh()->sort_order)->toBe(3);
});

test('category reorder requires every category exactly once', function () {
    $user = User::factory()->create();
    $first = Category::factory()->create(['sort_order' => 1]);
    $second = Category::factory()->create(['sort_order' => 2]);

    $response = $this
        ->actingAs($user)
        ->put(route('categories.reorder'), [
            'categories' => [$first->id, $first->id],
        ]);

    $response->assertSessionHasErrors(['categories.1']);

    $response = $this
        ->actingAs($user)
        ->put(route('categories.reorder'), [
            'categories' => [$second->id],
        ]);

    $response->assertSessionHasErrors(['categories']);
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
