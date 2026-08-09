<?php

namespace App\Http\Controllers\POS;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __invoke(): Response
    {
        $categories = Category::query()
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

        $products = Product::query()
            ->select(['id', 'category_id', 'name', 'price', 'image', 'is_available', 'sort_order'])
            ->with('category:id,name,sort_order')
            ->available()
            ->ordered()
            ->get()
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'category_id' => $product->category_id,
                'name' => $product->name,
                'price' => (int) round((float) $product->price),
                'image_url' => $product->image ? Storage::url($product->image) : null,
                'sort_order' => $product->sort_order,
                'category' => [
                    'id' => $product->category->id,
                    'name' => $product->category->name,
                ],
            ])
            ->all();

        return Inertia::render('pos/index', [
            'categories' => $categories,
            'products' => $products,
        ]);
    }
}
