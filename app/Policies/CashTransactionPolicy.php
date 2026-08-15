<?php

namespace App\Policies;

use App\Models\CashTransaction;
use App\Models\User;

class CashTransactionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, CashTransaction $cashTransaction): bool
    {
        return $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, CashTransaction $cashTransaction): bool
    {
        return false;
    }

    public function delete(User $user, CashTransaction $cashTransaction): bool
    {
        return $user->isAdmin();
    }

    public function restore(User $user, CashTransaction $cashTransaction): bool
    {
        return false;
    }

    public function forceDelete(User $user, CashTransaction $cashTransaction): bool
    {
        return false;
    }
}
