<?php

namespace App\Http\Requests;

use App\Models\CashTransaction;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreCashTransactionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', CashTransaction::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'transaction_date' => ['required', 'date'],
            'type' => ['required', Rule::in(CashTransaction::TYPES)],
            'category' => ['required', 'string', 'max:50'],
            'payment_method' => ['required', Rule::in(CashTransaction::PAYMENT_METHODS)],
            'amount' => ['required', 'integer', 'min:1', 'max:999999999'],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $type = (string) $this->input('type');
                $category = (string) $this->input('category');

                if (! in_array($type, CashTransaction::TYPES, true) || $category === '') {
                    return;
                }

                if (! in_array($category, CashTransaction::categoriesForType($type), true)) {
                    $validator->errors()->add('category', __('Kategori tidak sesuai dengan jenis transaksi.'));
                }
            },
        ];
    }
}
