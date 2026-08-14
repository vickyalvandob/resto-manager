<?php

namespace App\Http\Controllers;

use App\Actions\POS\GetAvailableMenu;
use App\Http\Requests\ReorderCategoriesRequest;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(): RedirectResponse
    {
        Gate::authorize('viewAny', Category::class);

        return to_route('products.index');
    }

    public function create(): Response
    {
        Gate::authorize('create', Category::class);

        return Inertia::render('categories/create');
    }

    public function store(StoreCategoryRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['sort_order'] ??= Category::nextSortOrder();

        Category::create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Category created.')]);

        return to_route('products.index');
    }

    public function edit(Category $category): Response
    {
        Gate::authorize('update', $category);

        $category->loadCount('products');

        return Inertia::render('categories/edit', [
            'category' => $this->categoryPayload($category),
        ]);
    }

    public function update(UpdateCategoryRequest $request, Category $category): RedirectResponse
    {
        $category->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Category updated.')]);

        return to_route('products.index');
    }

    public function reorder(ReorderCategoriesRequest $request): RedirectResponse
    {
        /** @var array<int, int> $categoryIds */
        $categoryIds = $request->validated('categories');

        DB::transaction(fn () => $this->updateCategoryOrder($categoryIds));
        GetAvailableMenu::flush();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Category order updated.')]);

        return to_route('products.index');
    }

    public function destroy(Category $category): RedirectResponse
    {
        Gate::authorize('delete', $category);

        if ($category->products()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('Category still has products.')]);

            return back();
        }

        $category->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Category deleted.')]);

        return to_route('products.index');
    }

    /**
     * @param  array<int, int>  $categoryIds
     */
    private function updateCategoryOrder(array $categoryIds): void
    {
        foreach ($categoryIds as $index => $categoryId) {
            Category::query()
                ->whereKey($categoryId)
                ->update(['sort_order' => $index + 1]);
        }
    }

    /**
     * @return array{id: int, name: string, description: string|null, sort_order: int, products_count: int}
     */
    private function categoryPayload(Category $category): array
    {
        return [
            'id' => $category->id,
            'name' => $category->name,
            'description' => $category->description,
            'sort_order' => $category->sort_order,
            'products_count' => $category->products_count,
        ];
    }
}
