<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::query()->firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Admin',
                'password' => 'password',
                'role' => 'admin',
                'email_verified_at' => now(),
            ],
        );

        User::query()->firstOrCreate(
            ['email' => 'cashier@example.com'],
            [
                'name' => 'Cashier',
                'password' => 'password',
                'role' => 'cashier',
                'email_verified_at' => now(),
            ],
        );

        $categories = collect([
            ['name' => 'Ayam', 'sort_order' => 1],
            ['name' => 'Ikan', 'sort_order' => 2],
            ['name' => 'Nasi', 'sort_order' => 3],
            ['name' => 'Minuman', 'sort_order' => 4],
        ])->mapWithKeys(fn (array $category): array => [
            $category['name'] => Category::query()->firstOrCreate(
                ['name' => $category['name']],
                ['sort_order' => $category['sort_order']],
            ),
        ]);

        $products = [
            ['category' => 'Ayam', 'name' => 'Ayam Bakar', 'price' => 32000, 'sort_order' => 1],
            ['category' => 'Ayam', 'name' => 'Ayam Goreng', 'price' => 30000, 'sort_order' => 2],
            ['category' => 'Ikan', 'name' => 'Lele Goreng', 'price' => 26000, 'sort_order' => 3],
            ['category' => 'Nasi', 'name' => 'Nasi Putih', 'price' => 7000, 'sort_order' => 4],
            ['category' => 'Minuman', 'name' => 'Es Teh', 'price' => 8000, 'sort_order' => 5],
            ['category' => 'Minuman', 'name' => 'Es Jeruk', 'price' => 12000, 'sort_order' => 6],
        ];

        foreach ($products as $product) {
            $category = $categories->get($product['category']);

            if (! $category instanceof Category) {
                continue;
            }

            Product::query()->firstOrCreate(
                [
                    'category_id' => $category->id,
                    'name' => $product['name'],
                ],
                [
                    'price' => $product['price'],
                    'is_active' => true,
                    'is_available' => true,
                    'sort_order' => $product['sort_order'],
                ],
            );
        }
    }
}
