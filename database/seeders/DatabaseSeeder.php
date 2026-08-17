<?php

namespace Database\Seeders;

use App\Actions\POS\GetAvailableMenu;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * @phpstan-type MenuProduct array{name: string, price: int<0, max>}
 * @phpstan-type MenuCategory array{name: string, section: string, products: array<int, MenuProduct>}
 */
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

        $menu = $this->menu();

        $categories = collect($menu)->mapWithKeys(fn (array $category, int $index): array => [
            $category['name'] => Category::query()->updateOrCreate(
                ['name' => $category['name']],
                [
                    'description' => $category['section'],
                    'sort_order' => $index + 1,
                ],
            ),
        ]);

        foreach ($menu as $categoryData) {
            $category = $categories->get($categoryData['name']);

            if (! $category instanceof Category) {
                continue;
            }

            if ($categoryData['name'] === 'Menu Spesial Sambal Gami') {
                Product::query()
                    ->where('category_id', $category->id)
                    ->whereIn('name', $this->legacyCombinedGamiProductNames())
                    ->delete();
            }

            foreach ($categoryData['products'] as $index => $productData) {
                $product = Product::query()->firstOrNew([
                    'category_id' => $category->id,
                    'name' => $productData['name'],
                ]);

                if (! $product->exists) {
                    $product->forceFill([
                        'is_active' => true,
                        'is_available' => true,
                    ]);
                }

                $product->forceFill([
                    'price' => $productData['price'],
                    'sort_order' => $index + 1,
                ]);
                $product->save();
            }
        }

        GetAvailableMenu::flush();
    }

    /**
     * @return array<int, MenuCategory>
     */
    private function menu(): array
    {
        return [
            [
                'name' => 'Nasi',
                'section' => 'Makanan',
                'products' => [
                    ['name' => 'Nasi Putih', 'price' => 6000],
                    ['name' => 'Nasi Jeruk', 'price' => 10000],
                    ['name' => 'Nasi Goreng Ayam', 'price' => 18000],
                    ['name' => 'Nasi Goreng Seafood', 'price' => 20000],
                    ['name' => 'Nasi Goreng Sapi', 'price' => 25000],
                ],
            ],
            [
                'name' => 'Ayam',
                'section' => 'Makanan',
                'products' => [
                    ['name' => 'Ayam Bakar Manis Pedas', 'price' => 17000],
                    ['name' => 'Ayam Bakar Madu', 'price' => 18000],
                    ['name' => 'Ayam Sambal Ijo', 'price' => 18000],
                    ['name' => 'Ayam Kremes', 'price' => 17000],
                    ['name' => 'Ayam Penyet', 'price' => 17000],
                    ['name' => 'Ayam Goreng Kalasan', 'price' => 25000],
                    ['name' => 'Ayam Bakar Kalasan', 'price' => 25000],
                    ['name' => 'Ayam Rica-Rica', 'price' => 25000],
                    ['name' => 'Ayam Lada Hitam', 'price' => 25000],
                    ['name' => 'Ayam Saus Tiram', 'price' => 25000],
                    ['name' => 'Ayam Saus Mentega', 'price' => 25000],
                    ['name' => 'Sop Ayam', 'price' => 25000],
                    ['name' => 'Soto Ayam', 'price' => 20000],
                ],
            ],
            [
                'name' => 'Lele',
                'section' => 'Makanan',
                'products' => [
                    ['name' => 'Pecel Lele', 'price' => 15000],
                    ['name' => 'Lele Kremes', 'price' => 15000],
                    ['name' => 'Lele Bakar', 'price' => 15000],
                ],
            ],
            [
                'name' => 'Ikan',
                'section' => 'Makanan',
                'products' => [
                    ['name' => 'Gurame Goreng', 'price' => 75000],
                    ['name' => 'Gurame Bakar', 'price' => 75000],
                    ['name' => 'Gurame Saus Pedas', 'price' => 75000],
                    ['name' => 'Gurame Asam Manis', 'price' => 75000],
                    ['name' => 'Nila Bakar', 'price' => 25000],
                    ['name' => 'Nila Goreng', 'price' => 25000],
                    ['name' => 'Bandeng Bakar', 'price' => 45000],
                    ['name' => 'Ikan Kuwe Bakar', 'price' => 80000],
                    ['name' => 'Sop Ikan Nila Kuah Kuning', 'price' => 30000],
                    ['name' => 'Sop Ikan Gurame Kuah Kuning', 'price' => 75000],
                ],
            ],
            [
                'name' => 'Udang',
                'section' => 'Makanan',
                'products' => [
                    ['name' => 'Udang Bakar', 'price' => 35000],
                    ['name' => 'Udang Lada Hitam', 'price' => 35000],
                    ['name' => 'Udang Lada Garam', 'price' => 35000],
                    ['name' => 'Udang Saus Padang', 'price' => 35000],
                    ['name' => 'Udang Goreng Tepung', 'price' => 35000],
                    ['name' => 'Udang Asam Manis', 'price' => 35000],
                    ['name' => 'Udang Saus Tiram', 'price' => 35000],
                    ['name' => 'Sop Udang', 'price' => 40000],
                ],
            ],
            [
                'name' => 'Cumi',
                'section' => 'Makanan',
                'products' => [
                    ['name' => 'Cumi Bakar', 'price' => 45000],
                    ['name' => 'Cumi Lada Hitam', 'price' => 45000],
                    ['name' => 'Cumi Lada Garam', 'price' => 45000],
                    ['name' => 'Cumi Saus Padang', 'price' => 45000],
                    ['name' => 'Cumi Goreng Tepung', 'price' => 45000],
                    ['name' => 'Cumi Asam Manis', 'price' => 45000],
                    ['name' => 'Cumi Saus Tiram', 'price' => 45000],
                ],
            ],
            [
                'name' => 'Iga & Sapi',
                'section' => 'Makanan',
                'products' => [
                    ['name' => 'Sop Iga Sapi', 'price' => 45000],
                    ['name' => 'Iga Bakar Saus BBQ', 'price' => 50000],
                    ['name' => 'Iga Penyet', 'price' => 50000],
                    ['name' => 'Sapi Lada Hitam', 'price' => 50000],
                ],
            ],
            [
                'name' => 'Menu Spesial Sambal Gami',
                'section' => 'Makanan',
                'products' => [
                    ['name' => 'Ayam Sambal Gami', 'price' => 22000],
                    ['name' => 'Ayam Pecak Gami', 'price' => 22000],
                    ['name' => 'Lele Sambal Gami', 'price' => 20000],
                    ['name' => 'Lele Pecak Gami', 'price' => 20000],
                    ['name' => 'Nila Sambal Gami', 'price' => 25000],
                    ['name' => 'Nila Pecak Gami', 'price' => 25000],
                    ['name' => 'Bandeng Sambal Gami', 'price' => 30000],
                    ['name' => 'Bandeng Pecak Gami', 'price' => 30000],
                    ['name' => 'Udang Sambal Gami', 'price' => 35000],
                    ['name' => 'Udang Pecak Gami', 'price' => 35000],
                    ['name' => 'Cumi Sambal Gami', 'price' => 45000],
                    ['name' => 'Cumi Pecak Gami', 'price' => 45000],
                    ['name' => 'Iga Bakar Gami', 'price' => 50000],
                    ['name' => 'Iga Pecak Gami', 'price' => 50000],
                    ['name' => 'Sapi Pecak Gami', 'price' => 50000],
                ],
            ],
            [
                'name' => 'Sayuran & Tambahan',
                'section' => 'Makanan',
                'products' => [
                    ['name' => 'Cah Kangkung', 'price' => 13000],
                    ['name' => 'Cah Toge', 'price' => 13000],
                    ['name' => 'Cah Buncis', 'price' => 13000],
                    ['name' => 'Cah Capcay Ayam', 'price' => 25000],
                    ['name' => 'Cah Capcay Seafood', 'price' => 30000],
                    ['name' => 'Cah Timun Telur', 'price' => 12000],
                    ['name' => 'Terong Balado', 'price' => 12000],
                    ['name' => 'Tahu / Tempe', 'price' => 2000],
                    ['name' => 'Ati Ampela / Kulit', 'price' => 5000],
                    ['name' => 'Pete', 'price' => 8000],
                ],
            ],
            [
                'name' => 'Minuman Dingin',
                'section' => 'Minuman',
                'products' => [
                    ['name' => 'Air Es', 'price' => 2000],
                    ['name' => 'Es Teh Tawar', 'price' => 3000],
                    ['name' => 'Es Teh Manis', 'price' => 5000],
                    ['name' => 'Es Teh Susu', 'price' => 8000],
                    ['name' => 'Es Teh Jeruk', 'price' => 8000],
                    ['name' => 'Es Jeruk', 'price' => 8000],
                    ['name' => 'Es Jeruk Nipis', 'price' => 8000],
                    ['name' => 'Lemon Tea', 'price' => 8000],
                    ['name' => 'Susu Cokelat', 'price' => 8000],
                    ['name' => 'Susu Putih', 'price' => 8000],
                    ['name' => 'Mineral Botol', 'price' => 5000],
                ],
            ],
            [
                'name' => 'Minuman Panas',
                'section' => 'Minuman',
                'products' => [
                    ['name' => 'Teh Tawar', 'price' => 1000],
                    ['name' => 'Teh Manis', 'price' => 4000],
                    ['name' => 'Teh Susu', 'price' => 8000],
                    ['name' => 'Lemon Tea', 'price' => 8000],
                    ['name' => 'Jeruk', 'price' => 8000],
                    ['name' => 'Kopi Hitam', 'price' => 5000],
                    ['name' => 'Kopi Liong Bulan', 'price' => 5000],
                    ['name' => 'Kopi Susu', 'price' => 5000],
                ],
            ],
        ];
    }

    /**
     * @return array<int, string>
     */
    private function legacyCombinedGamiProductNames(): array
    {
        return [
            'Ayam Sambal / Pecak Gami',
            'Lele Sambal / Pecak Gami',
            'Nila Sambal / Pecak Gami',
            'Bandeng Sambal / Pecak Gami',
            'Udang Sambal / Pecak Gami',
            'Cumi Sambal / Pecak Gami',
        ];
    }
}
