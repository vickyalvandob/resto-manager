<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', User::class);

        $currentUser = $request->user();
        abort_unless($currentUser instanceof User, 403);

        $filters = [
            'search' => trim((string) $request->query('search', '')),
            'role' => (string) $request->query('role', ''),
        ];
        $adminCount = User::query()->where('role', 'admin')->count();

        $users = User::query()
            ->select(['id', 'name', 'email', 'role', 'email_verified_at', 'created_at', 'updated_at'])
            ->withCount('orders')
            ->when($filters['search'] !== '', function ($query) use ($filters): void {
                $search = $filters['search'];

                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when(in_array($filters['role'], ['admin', 'cashier'], true), fn ($query) => $query->where('role', $filters['role']))
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (User $user): array => [
                ...$this->userPayload($user),
                'orders_count' => (int) $user->getAttribute('orders_count'),
                'can_delete' => $this->canDeleteFromList($currentUser, $user, $adminCount),
            ]);

        return Inertia::render('users/index', [
            'users' => $users,
            'filters' => $filters,
            'roleOptions' => $this->roleOptions(),
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', User::class);

        return Inertia::render('users/create', [
            'roleOptions' => $this->roleOptions(),
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        User::query()->create($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User created.')]);

        return to_route('users.index');
    }

    public function edit(User $user): Response
    {
        Gate::authorize('update', $user);

        return Inertia::render('users/edit', [
            'user' => $this->userPayload($user),
            'roleOptions' => $this->roleOptions(),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $data = $request->validated();

        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        }

        $user->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User updated.')]);

        return to_route('users.index');
    }

    public function destroy(User $user): RedirectResponse
    {
        Gate::authorize('delete', $user);

        if ($user->orders()->exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('User has order history and cannot be deleted.')]);

            return back();
        }

        $user->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User deleted.')]);

        return to_route('users.index');
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function roleOptions(): array
    {
        return [
            ['value' => 'admin', 'label' => 'Admin'],
            ['value' => 'cashier', 'label' => 'Cashier'],
        ];
    }

    /**
     * @return array{id: int, name: string, email: string, role: string, email_verified_at: string|null, created_at: string|null, updated_at: string|null}
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'email_verified_at' => $user->email_verified_at?->toISOString(),
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ];
    }

    private function canDeleteFromList(User $currentUser, User $user, int $adminCount): bool
    {
        if ($currentUser->id === $user->id) {
            return false;
        }

        if ($user->role === 'admin' && $adminCount <= 1) {
            return false;
        }

        return ((int) $user->getAttribute('orders_count')) === 0;
    }
}
