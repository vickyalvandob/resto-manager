<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('viewAny', Category::class);

        $categories = Category::query()
            ->select(['id', 'name', 'description', 'created_at'])
            ->withCount('products')
            ->latest()
            ->paginate(10)
            ->through(fn (Category $category): array => $this->categoryPayload($category));

        return Inertia::render('categories/index', [
            'categories' => $categories,
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Category::class);

        return Inertia::render('categories/create');
    }

    public function store(StoreCategoryRequest $request): RedirectResponse
    {
        Category::create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Category created.')]);

        return to_route('categories.index');
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

        return to_route('categories.index');
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

        return to_route('categories.index');
    }

    /**
     * @return array{id: int, name: string, description: string|null, products_count: int}
     */
    private function categoryPayload(Category $category): array
    {
        return [
            'id' => $category->id,
            'name' => $category->name,
            'description' => $category->description,
            'products_count' => $category->products_count,
        ];
    }
}
