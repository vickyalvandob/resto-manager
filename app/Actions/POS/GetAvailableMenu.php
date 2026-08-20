<?php

namespace App\Actions\POS;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Cache\Repository as CacheRepository;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

/**
 * @phpstan-type PosCategoryPayload array{id: int, name: string, sort_order: int, products_count: int}
 * @phpstan-type PosProductPayload array{id: int, category_id: int, name: string, price: int, image_url: string|null, sort_order: int, category: array{id: int, name: string}}
 * @phpstan-type PosMenuPayload array{categories: array<int, PosCategoryPayload>, products: array<int, PosProductPayload>}
 */
class GetAvailableMenu
{
    public const CACHE_KEY = 'pos.available-menu.v2';

    private const FRESH_SECONDS = 300;

    private const STALE_SECONDS = 900;

    /**
     * @return PosMenuPayload
     */
    public function handle(): array
    {
        /** @var PosMenuPayload $payload */
        $payload = Cache::flexible(
            self::CACHE_KEY,
            [self::FRESH_SECONDS, self::STALE_SECONDS],
            fn (): array => $this->freshPayload(),
        );

        return $payload;
    }

    /**
     * @return array<int, PosProductPayload>
     */
    public function products(): array
    {
        return $this->handle()['products'];
    }

    public static function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
        Cache::forget(CacheRepository::FLEXIBLE_CREATED_KEY_PREFIX.self::CACHE_KEY);
    }

    /**
     * @return PosMenuPayload
     */
    private function freshPayload(): array
    {
        return [
            'categories' => $this->categoriesPayload(),
            'products' => $this->productsPayload(),
        ];
    }

    /**
     * @return array<int, PosCategoryPayload>
     */
    private function categoriesPayload(): array
    {
        return Category::query()
            ->select(['id', 'name', 'sort_order'])
            ->withCount(['products' => fn ($query) => $query->available()])
            ->ordered()
            ->get()
            ->filter(fn (Category $category): bool => $category->products_count > 0)
            ->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'sort_order' => $category->sort_order,
                'products_count' => $category->products_count,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, PosProductPayload>
     */
    private function productsPayload(): array
    {
        $categoriesTable = (new Category)->getTable();
        $productsTable = (new Product)->getTable();

        return Product::query()
            ->select([
                "{$productsTable}.id",
                "{$productsTable}.category_id",
                "{$productsTable}.name",
                "{$productsTable}.price",
                "{$productsTable}.image",
                "{$productsTable}.is_available",
                "{$productsTable}.sort_order",
            ])
            ->join($categoriesTable, "{$categoriesTable}.id", '=', "{$productsTable}.category_id")
            ->with('category:id,name,sort_order')
            ->available()
            ->orderBy("{$categoriesTable}.sort_order")
            ->orderBy("{$categoriesTable}.id")
            ->orderBy("{$productsTable}.sort_order")
            ->orderBy("{$productsTable}.name")
            ->orderBy("{$productsTable}.id")
            ->get()
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'category_id' => $product->category_id,
                'name' => $product->name,
                'price' => (int) $product->price,
                'image_url' => $product->image ? Storage::url($product->image) : null,
                'sort_order' => $product->sort_order,
                'category' => [
                    'id' => $product->category->id,
                    'name' => $product->category->name,
                ],
            ])
            ->all();
    }
}
