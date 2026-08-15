<?php

use App\Models\CashTransaction;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected from users', function () {
    $this
        ->get(route('users.index'))
        ->assertRedirect(route('login'));
});

test('cashier cannot manage users', function () {
    $cashier = User::factory()->cashier()->create();

    $this
        ->actingAs($cashier)
        ->get(route('users.index'))
        ->assertForbidden();

    $this
        ->actingAs($cashier)
        ->post(route('users.store'), [
            'name' => 'New Cashier',
            'email' => 'new-cashier@example.com',
            'role' => 'cashier',
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'StrongPassword123!',
        ])
        ->assertForbidden();
});

test('admin can view users and filter by role and search', function () {
    $admin = User::factory()->admin()->create(['name' => 'Owner Admin']);
    $cashier = User::factory()->cashier()->create([
        'name' => 'Front Cashier',
        'email' => 'front@example.com',
    ]);
    User::factory()->cashier()->create(['name' => 'Back Counter']);

    $this
        ->actingAs($admin)
        ->get(route('users.index', ['role' => 'cashier', 'search' => 'front']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/index')
            ->where('filters.role', 'cashier')
            ->where('filters.search', 'front')
            ->has('roleOptions', 2)
            ->has('users.data', 1)
            ->where('users.data.0.id', $cashier->id)
            ->where('users.data.0.name', 'Front Cashier')
            ->where('users.data.0.role', 'cashier')
            ->where('users.data.0.can_delete', true)
        );
});

test('admin can open create and edit user pages', function () {
    $admin = User::factory()->admin()->create();
    $cashier = User::factory()->cashier()->create(['name' => 'Front Cashier']);

    $this
        ->actingAs($admin)
        ->get(route('users.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/create')
            ->has('roleOptions', 2)
        );

    $this
        ->actingAs($admin)
        ->get(route('users.edit', $cashier))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('users/edit')
            ->where('user.id', $cashier->id)
            ->where('user.name', 'Front Cashier')
            ->where('user.role', 'cashier')
        );
});

test('admin can create users with admin or cashier roles', function (string $role) {
    $admin = User::factory()->admin()->create();

    $response = $this
        ->actingAs($admin)
        ->post(route('users.store'), [
            'name' => 'Managed User',
            'email' => "{$role}@example.com",
            'role' => $role,
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'StrongPassword123!',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('users.index'));

    $user = User::where('email', "{$role}@example.com")->firstOrFail();

    expect($user->name)->toBe('Managed User')
        ->and($user->role)->toBe($role)
        ->and(Hash::check('StrongPassword123!', $user->password))->toBeTrue();
})->with(['admin', 'cashier']);

test('admin can update users and leave password unchanged', function () {
    $admin = User::factory()->admin()->create();
    $cashier = User::factory()->cashier()->create([
        'email' => 'cashier@example.com',
        'password' => Hash::make('OldPassword123!'),
    ]);

    $response = $this
        ->actingAs($admin)
        ->put(route('users.update', $cashier), [
            'name' => 'Updated User',
            'email' => 'updated@example.com',
            'role' => 'admin',
            'password' => '',
            'password_confirmation' => '',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('users.index'));

    $cashier->refresh();

    expect($cashier->name)->toBe('Updated User')
        ->and($cashier->email)->toBe('updated@example.com')
        ->and($cashier->role)->toBe('admin')
        ->and(Hash::check('OldPassword123!', $cashier->password))->toBeTrue();
});

test('admin can update a user password', function () {
    $admin = User::factory()->admin()->create();
    $cashier = User::factory()->cashier()->create([
        'password' => Hash::make('OldPassword123!'),
    ]);

    $this
        ->actingAs($admin)
        ->put(route('users.update', $cashier), [
            'name' => $cashier->name,
            'email' => $cashier->email,
            'role' => 'cashier',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])
        ->assertSessionHasNoErrors();

    expect(Hash::check('NewPassword123!', $cashier->refresh()->password))->toBeTrue();
});

test('user validation requires unique email valid role and confirmed password', function () {
    $admin = User::factory()->admin()->create();
    User::factory()->cashier()->create(['email' => 'taken@example.com']);

    $this
        ->actingAs($admin)
        ->post(route('users.store'), [
            'name' => '',
            'email' => 'taken@example.com',
            'role' => 'manager',
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'different',
        ])
        ->assertSessionHasErrors(['name', 'email', 'role', 'password']);
});

test('admin cannot change own role or remove the last admin role', function () {
    $admin = User::factory()->admin()->create();
    $otherAdmin = User::factory()->admin()->create();

    $this
        ->actingAs($admin)
        ->put(route('users.update', $admin), [
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => 'cashier',
            'password' => '',
            'password_confirmation' => '',
        ])
        ->assertSessionHasErrors(['role']);

    expect($admin->refresh()->role)->toBe('admin');

    $otherAdmin->delete();

    $this
        ->actingAs($admin)
        ->put(route('users.update', $admin), [
            'name' => $admin->name,
            'email' => $admin->email,
            'role' => 'cashier',
            'password' => '',
            'password_confirmation' => '',
        ])
        ->assertSessionHasErrors(['role']);

    expect($admin->refresh()->role)->toBe('admin');
});

test('admin can delete users that are safe to delete', function () {
    $admin = User::factory()->admin()->create();
    $cashier = User::factory()->cashier()->create();

    $response = $this
        ->actingAs($admin)
        ->delete(route('users.destroy', $cashier));

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('users.index'));

    $this->assertModelMissing($cashier);
});

test('admin cannot delete self or users with transaction history', function () {
    $admin = User::factory()->admin()->create();
    $cashier = User::factory()->cashier()->create();
    $cashierWithCashHistory = User::factory()->cashier()->create();

    createOrderForCashier($cashier);
    CashTransaction::factory()->for($cashierWithCashHistory, 'user')->create();

    $this
        ->actingAs($admin)
        ->delete(route('users.destroy', $admin))
        ->assertForbidden();

    $this
        ->actingAs($admin)
        ->from(route('users.index'))
        ->delete(route('users.destroy', $cashier))
        ->assertRedirect(route('users.index'));

    $this->assertModelExists($cashier);

    $this
        ->actingAs($admin)
        ->from(route('users.index'))
        ->delete(route('users.destroy', $cashierWithCashHistory))
        ->assertRedirect(route('users.index'));

    $this->assertModelExists($cashierWithCashHistory);
});

function createOrderForCashier(User $cashier): Order
{
    return Order::query()->create([
        'queue_number' => 1,
        'invoice_number' => 'INV-USER-001',
        'customer_name' => null,
        'order_type' => 'dine_in',
        'subtotal' => 10000,
        'grand_total' => 10000,
        'payment_method' => null,
        'paid_amount' => 0,
        'change_amount' => 0,
        'status' => 'open',
        'cashier_id' => $cashier->id,
    ]);
}
