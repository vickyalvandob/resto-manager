<?php

use App\Models\Category;
use App\Models\Product;
use Database\Seeders\DatabaseSeeder;

test('database seeder creates the resto menu categories and products', function () {
    $legacyGami = Category::query()->create([
        'name' => 'Menu Spesial Sambal Gami',
        'sort_order' => 99,
    ]);

    Product::query()->create([
        'category_id' => $legacyGami->id,
        'name' => 'Ayam Sambal / Pecak Gami',
        'price' => 22000,
        'is_active' => true,
        'is_available' => true,
        'sort_order' => 1,
    ]);

    $this->seed(DatabaseSeeder::class);

    $expectedCategories = [
        'Nasi',
        'Ayam',
        'Lele',
        'Ikan',
        'Udang',
        'Cumi',
        'Iga & Sapi',
        'Menu Spesial Sambal Gami',
        'Sayuran & Tambahan',
        'Minuman Dingin',
        'Minuman Panas',
    ];

    expect(Category::query()->orderBy('sort_order')->pluck('name')->all())
        ->toBe($expectedCategories)
        ->and(Product::query()->count())->toBe(94);

    $expectedProductCounts = [
        'Nasi' => 5,
        'Ayam' => 13,
        'Lele' => 3,
        'Ikan' => 10,
        'Udang' => 8,
        'Cumi' => 7,
        'Iga & Sapi' => 4,
        'Menu Spesial Sambal Gami' => 15,
        'Sayuran & Tambahan' => 10,
        'Minuman Dingin' => 11,
        'Minuman Panas' => 8,
    ];

    foreach ($expectedProductCounts as $categoryName => $expectedCount) {
        $category = Category::query()->where('name', $categoryName)->firstOrFail();

        expect(Product::query()->where('category_id', $category->id)->count())
            ->toBe($expectedCount);
    }

    $ikan = Category::query()->where('name', 'Ikan')->firstOrFail();
    $gami = Category::query()->where('name', 'Menu Spesial Sambal Gami')->firstOrFail();
    $nasi = Category::query()->where('name', 'Nasi')->firstOrFail();
    $minumanDingin = Category::query()->where('name', 'Minuman Dingin')->firstOrFail();
    $minumanPanas = Category::query()->where('name', 'Minuman Panas')->firstOrFail();

    $this->assertDatabaseHas('products', [
        'category_id' => $nasi->id,
        'name' => 'Nasi Putih',
        'price' => 6000,
    ]);

    $this->assertDatabaseHas('products', [
        'category_id' => $ikan->id,
        'name' => 'Sop Ikan Gurame Kuah Kuning',
        'price' => 75000,
    ]);

    $this->assertDatabaseHas('products', [
        'category_id' => $gami->id,
        'name' => 'Ayam Sambal Gami',
        'price' => 22000,
    ]);

    $this->assertDatabaseHas('products', [
        'category_id' => $gami->id,
        'name' => 'Ayam Pecak Gami',
        'price' => 22000,
    ]);

    $this->assertDatabaseMissing('products', [
        'category_id' => $gami->id,
        'name' => 'Ayam Sambal / Pecak Gami',
    ]);

    $this->assertDatabaseHas('products', [
        'category_id' => $minumanDingin->id,
        'name' => 'Lemon Tea',
        'price' => 8000,
    ]);

    $this->assertDatabaseHas('products', [
        'category_id' => $minumanPanas->id,
        'name' => 'Lemon Tea',
        'price' => 8000,
    ]);
});
