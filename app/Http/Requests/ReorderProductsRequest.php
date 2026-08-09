<?php

namespace App\Http\Requests;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ReorderProductsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('reorder', Product::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', Rule::exists((new Category)->getTable(), 'id')],
            'products' => ['required', 'array'],
            'products.*' => ['integer', 'distinct', Rule::exists((new Product)->getTable(), 'id')],
        ];
    }

    /**
     * Get the "after" validation callables for the request.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $categoryId = (int) $this->input('category_id');
                $submittedProductIds = array_map(
                    fn (mixed $productId): int => (int) $productId,
                    $this->array('products'),
                );
                $expectedProductIds = Product::query()
                    ->where('category_id', $categoryId)
                    ->pluck('id')
                    ->map(fn (mixed $productId): int => (int) $productId)
                    ->all();

                sort($submittedProductIds);
                sort($expectedProductIds);

                if ($submittedProductIds !== $expectedProductIds) {
                    $validator->errors()->add(
                        'products',
                        __('Urutan produk tidak sinkron. Refresh lalu coba lagi.'),
                    );
                }
            },
        ];
    }
}
