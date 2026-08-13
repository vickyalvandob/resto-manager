<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->route('user');

        return $user instanceof User && ($this->user()?->can('update', $user) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->route('user');
        $userId = $user instanceof User ? $user->id : null;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class)->ignore($userId)],
            'role' => ['required', Rule::in(['admin', 'cashier'])],
            'password' => ['nullable', 'string', Password::default(), 'confirmed'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $managedUser = $this->route('user');
                $currentUser = $this->user();

                if (! $managedUser instanceof User || ! $currentUser instanceof User) {
                    return;
                }

                $role = (string) $this->input('role');

                if ($managedUser->id === $currentUser->id && $role !== $managedUser->role) {
                    $validator->errors()->add('role', __('You cannot change your own role.'));
                }

                if (
                    $managedUser->role === 'admin'
                    && $role !== 'admin'
                    && ! User::query()->where('role', 'admin')->whereKeyNot($managedUser->id)->exists()
                ) {
                    $validator->errors()->add('role', __('At least one admin user is required.'));
                }
            },
        ];
    }
}
