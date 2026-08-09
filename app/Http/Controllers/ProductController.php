<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', Product::class);

        $products = Product::query()
            ->select(['id', 'category_id', 'name', 'description', 'price', 'image', 'is_active', 'is_available', 'sort_order', 'created_at'])
            ->with('category:id,name,description,sort_order')
            ->ordered()
            ->paginate(10)
            ->through(fn (Product $product): array => $this->productPayload($product));

        return Inertia::render('products/index', [
            'products' => $products,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Product::class);

        return Inertia::render('products/create', [
            'categories' => $this->categoryOptions(),
        ]);
    }

    public function edit(Product $product): Response
    {
        Gate::authorize('update', $product);

        $product->load('category');

        return Inertia::render('products/edit', [
            'product' => $this->productPayload($product),
            'categories' => $this->categoryOptions(),
        ]);
    }

    public function store(StoreProductRequest $request): RedirectResponse
    {
        $data = $this->productData($request->validated());

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('products', 'public');
        }

        Product::create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Product created.')]);

        return to_route('products.index');
    }

    public function update(UpdateProductRequest $request, Product $product): RedirectResponse
    {
        $data = $this->productData($request->validated());

        if ($request->boolean('remove_image') && $product->image) {
            Storage::disk('public')->delete($product->image);
            $data['image'] = null;
        }

        if ($request->hasFile('image')) {
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }

            $data['image'] = $request->file('image')->store('products', 'public');
        }

        $product->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Product updated.')]);

        return to_route('products.index');
    }

    public function destroy(Product $product): RedirectResponse
    {
        Gate::authorize('delete', $product);

        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }

        $product->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Product deleted.')]);

        return to_route('products.index');
    }

    public function toggleAvailability(Product $product): RedirectResponse
    {
        Gate::authorize('update', $product);

        $isAvailable = ! $product->is_available;

        $product->update([
            'is_available' => $isAvailable,
            'is_active' => $isAvailable,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $isAvailable ? __('Produk tersedia.') : __('Produk tidak tersedia.'),
        ]);

        return to_route('products.index');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function productData(array $data): array
    {
        unset($data['remove_image']);

        if (array_key_exists('is_available', $data)) {
            $data['is_active'] = $data['is_available'];
        }

        if (! array_key_exists('is_available', $data) && array_key_exists('is_active', $data)) {
            $data['is_available'] = $data['is_active'];
        }

        return $data;
    }

    /**
     * @return array<int, array{id: int, name: string, description: string|null, sort_order: int}>
     */
    private function categoryOptions(): array
    {
        return Category::query()
            ->ordered()
            ->get(['id', 'name', 'description', 'sort_order'])
            ->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
                'description' => $category->description,
                'sort_order' => $category->sort_order,
            ])
            ->all();
    }

    /**
     * @return array{id: int, category_id: int, name: string, description: string|null, price: int, image: string|null, image_url: string|null, is_active: bool, is_available: bool, sort_order: int, category: array{id: int, name: string, description: string|null, sort_order: int}}
     */
    private function productPayload(Product $product): array
    {
        return [
            'id' => $product->id,
            'category_id' => $product->category_id,
            'name' => $product->name,
            'description' => $product->description,
            'price' => (int) $product->price,
            'image' => $product->image,
            'image_url' => $product->image ? Storage::url($product->image) : null,
            'is_active' => $product->is_active,
            'is_available' => $product->is_available,
            'sort_order' => $product->sort_order,
            'category' => [
                'id' => $product->category->id,
                'name' => $product->category->name,
                'description' => $product->category->description,
                'sort_order' => $product->category->sort_order,
            ],
        ];
    }
}
