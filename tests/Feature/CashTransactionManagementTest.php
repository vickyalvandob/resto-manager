<?php

use App\Models\CashTransaction;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected from cash transactions', function () {
    $this
        ->get(route('cash-transactions.index'))
        ->assertRedirect(route('login'));
});

test('cashier cannot manage cash transactions', function () {
    $cashier = User::factory()->cashier()->create();
    $transaction = CashTransaction::factory()->for($cashier, 'user')->create();

    $this
        ->actingAs($cashier)
        ->get(route('cash-transactions.index'))
        ->assertForbidden();

    $this
        ->actingAs($cashier)
        ->post(route('cash-transactions.store'), [
            'transaction_date' => '2026-08-14',
            'type' => CashTransaction::TYPE_EXPENSE,
            'category' => 'Belanja Bahan',
            'payment_method' => 'cash',
            'amount' => 25000,
            'description' => 'Sayur pagi',
        ])
        ->assertForbidden();

    $this
        ->actingAs($cashier)
        ->delete(route('cash-transactions.destroy', $transaction))
        ->assertForbidden();
});

test('cash transactions page displays daily summary list filters and categories', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-14 12:00:00'));

    try {
        $admin = User::factory()->admin()->create(['name' => 'Owner Admin']);

        CashTransaction::factory()
            ->income()
            ->for($admin, 'user')
            ->create([
                'transaction_date' => '2026-08-14',
                'category' => 'Penjualan Manual',
                'payment_method' => 'qris',
                'amount' => 75000,
                'description' => 'Order luar POS',
            ]);

        CashTransaction::factory()
            ->expense()
            ->for($admin, 'user')
            ->create([
                'transaction_date' => '2026-08-14',
                'category' => 'Belanja Bahan',
                'payment_method' => 'cash',
                'amount' => 30000,
                'description' => 'Sayur pagi',
            ]);

        CashTransaction::factory()
            ->expense()
            ->for($admin, 'user')
            ->create([
                'transaction_date' => '2026-08-13',
                'category' => 'Transport',
                'amount' => 5000,
            ]);

        $this
            ->actingAs($admin)
            ->get(route('cash-transactions.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('cash-transactions/index')
                ->where('filters.range', 'today')
                ->where('filters.from', '2026-08-14')
                ->where('filters.to', '2026-08-14')
                ->where('summary.total_income', 75000)
                ->where('summary.total_expense', 30000)
                ->where('summary.balance', 45000)
                ->where('summary.total_transactions', 2)
                ->has('categoryBreakdown', 2)
                ->where('transactions.total', 2)
                ->where('transactions.data.0.category', 'Belanja Bahan')
                ->where('transactions.data.0.user.name', 'Owner Admin')
                ->has('typeOptions', 2)
                ->has('paymentOptions', 3)
                ->has('categoryOptions', 2)
                ->where('categoryOptions.0.items.1.value', 'Penjualan Online')
            );

        $this
            ->actingAs($admin)
            ->get(route('cash-transactions.index', [
                'range' => 'this_week',
                'type' => CashTransaction::TYPE_EXPENSE,
                'search' => 'bahan',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.range', 'this_week')
                ->where('filters.type', CashTransaction::TYPE_EXPENSE)
                ->where('filters.search', 'bahan')
                ->where('summary.total_income', 0)
                ->where('summary.total_expense', 30000)
                ->where('transactions.total', 1)
                ->where('transactions.data.0.category', 'Belanja Bahan')
            );
    } finally {
        Carbon::setTestNow();
    }
});

test('admin can create cash transactions', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-14 12:00:00'));

    try {
        $admin = User::factory()->admin()->create();

        $response = $this
            ->actingAs($admin)
            ->post(route('cash-transactions.store'), [
                'transaction_date' => '2026-08-14',
                'type' => CashTransaction::TYPE_EXPENSE,
                'category' => 'Belanja Bahan',
                'payment_method' => 'cash',
                'amount' => 42000,
                'description' => 'Belanja ayam',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('cash-transactions.index'));

        $transaction = CashTransaction::where('category', 'Belanja Bahan')->firstOrFail();

        expect($transaction->user_id)->toBe($admin->id)
            ->and($transaction->transaction_date->toDateString())->toBe('2026-08-14')
            ->and($transaction->type)->toBe(CashTransaction::TYPE_EXPENSE)
            ->and($transaction->payment_method)->toBe('cash')
            ->and($transaction->amount)->toBe(42000)
            ->and($transaction->description)->toBe('Belanja ayam');
    } finally {
        Carbon::setTestNow();
    }
});

test('admin can create online sales income cash transactions', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-14 12:00:00'));

    try {
        $admin = User::factory()->admin()->create();

        $response = $this
            ->actingAs($admin)
            ->post(route('cash-transactions.store'), [
                'transaction_date' => '2026-08-14',
                'type' => CashTransaction::TYPE_INCOME,
                'category' => 'Penjualan Online',
                'payment_method' => 'transfer',
                'amount' => 125000,
                'description' => 'Marketplace',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('cash-transactions.index'));

        $transaction = CashTransaction::where('category', 'Penjualan Online')->firstOrFail();

        expect($transaction->user_id)->toBe($admin->id)
            ->and($transaction->transaction_date->toDateString())->toBe('2026-08-14')
            ->and($transaction->type)->toBe(CashTransaction::TYPE_INCOME)
            ->and($transaction->payment_method)->toBe('transfer')
            ->and($transaction->amount)->toBe(125000)
            ->and($transaction->description)->toBe('Marketplace');
    } finally {
        Carbon::setTestNow();
    }
});

test('cash transaction validation requires valid details and matching category', function () {
    $admin = User::factory()->admin()->create();

    $this
        ->actingAs($admin)
        ->post(route('cash-transactions.store'), [
            'transaction_date' => '',
            'type' => CashTransaction::TYPE_EXPENSE,
            'category' => 'Tambahan Modal',
            'payment_method' => 'bank',
            'amount' => 0,
            'description' => str_repeat('a', 256),
        ])
        ->assertSessionHasErrors([
            'transaction_date',
            'category',
            'payment_method',
            'amount',
            'description',
        ]);
});

test('admin can delete cash transactions', function () {
    $admin = User::factory()->admin()->create();
    $transaction = CashTransaction::factory()->for($admin, 'user')->create();

    $this
        ->actingAs($admin)
        ->from(route('cash-transactions.index'))
        ->delete(route('cash-transactions.destroy', $transaction))
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('cash-transactions.index'));

    $this->assertModelMissing($transaction);
});

test('cash transactions page uses modal entry actions and safe delete dialog', function () {
    $page = file_get_contents(resource_path('js/pages/cash-transactions/index.tsx'));
    $typeFilterPosition = strpos($page, '<TypeFilterPanel');
    $dateFilterPosition = strpos($page, '<DateFilterPanel');
    $metricPosition = strpos($page, '<Metric');
    $tablePosition = strpos($page, 'Daftar Transaksi');
    $categoryPosition = strpos($page, '<CategoryBreakdownCard');

    expect($page)
        ->toContain('TypeFilterPanel')
        ->toContain('DateFilterPanel')
        ->toContain('TransactionEntryDialog')
        ->toContain('Tambah Pemasukan')
        ->toContain('Tambah Pengeluaran')
        ->toContain('Reset Filter')
        ->toContain('Daftar Transaksi')
        ->toContain('Kategori Terbesar')
        ->toContain("from '@/components/ui/alert-dialog'")
        ->toContain("from '@/components/ui/dialog'")
        ->not->toContain('QuickEntryForm')
        ->not->toContain('window.confirm')
        ->not->toContain('window.alert');

    expect($typeFilterPosition)
        ->not->toBeFalse()
        ->and($dateFilterPosition)->not->toBeFalse()
        ->and($metricPosition)->not->toBeFalse()
        ->and($tablePosition)->not->toBeFalse()
        ->and($categoryPosition)->not->toBeFalse()
        ->and($typeFilterPosition)->toBeLessThan($dateFilterPosition)
        ->and($dateFilterPosition)->toBeLessThan($metricPosition)
        ->and($metricPosition)->toBeLessThan($tablePosition)
        ->and($tablePosition)->toBeLessThan($categoryPosition);
});
