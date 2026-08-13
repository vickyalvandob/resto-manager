<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, User $managedUser): bool
    {
        return $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, User $managedUser): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, User $managedUser): bool
    {
        if (! $user->isAdmin() || $user->id === $managedUser->id) {
            return false;
        }

        if ($managedUser->role === 'admin') {
            return User::query()->where('role', 'admin')->whereKeyNot($managedUser->id)->exists();
        }

        return true;
    }

    public function restore(User $user, User $managedUser): bool
    {
        return false;
    }

    public function forceDelete(User $user, User $managedUser): bool
    {
        return false;
    }
}
