<?php

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('dashboard includes transaction chart ranges', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-10 12:00:00'));

    try {
        $user = User::factory()->create();

        createDashboardOrder($user, 'INV-AUG-10', 'paid', '2026-08-10 09:00:00', 10000);
        createDashboardOrder($user, 'INV-AUG-09', 'paid', '2026-08-09 09:00:00', 20000);
        createDashboardOrder($user, 'INV-AUG-01', 'paid', '2026-08-01 09:00:00', 30000);
        createDashboardOrder($user, 'INV-JUN-15', 'paid', '2026-06-15 09:00:00', 40000);
        createDashboardOrder($user, 'INV-MAY-31', 'paid', '2026-05-31 09:00:00', 90000);
        createDashboardOrder($user, 'INV-OPEN', 'open', null, 50000);

        $response = $this
            ->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk();

        $chart = $response->inertiaProps('transactionChart');

        expect($chart['last_7_days']['points'])
            ->toHaveCount(7)
            ->and($chart['last_7_days']['total_transactions'])->toBe(2)
            ->and($chart['last_7_days']['total_revenue'])->toBe(30000)
            ->and($chart['last_7_days']['points'][5]['period'])->toBe('2026-08-09')
            ->and($chart['last_7_days']['points'][5]['transactions'])->toBe(1)
            ->and($chart['last_7_days']['points'][6]['period'])->toBe('2026-08-10')
            ->and($chart['last_7_days']['points'][6]['revenue'])->toBe(10000)
            ->and($chart['last_30_days']['points'])->toHaveCount(30)
            ->and($chart['last_30_days']['total_transactions'])->toBe(3)
            ->and($chart['last_30_days']['total_revenue'])->toBe(60000)
            ->and($chart['last_3_months']['points'])->toHaveCount(3)
            ->and($chart['last_3_months']['points'][0]['period'])->toBe('2026-06')
            ->and($chart['last_3_months']['points'][0]['revenue'])->toBe(40000)
            ->and($chart['last_3_months']['points'][1]['period'])->toBe('2026-07')
            ->and($chart['last_3_months']['points'][1]['transactions'])->toBe(0)
            ->and($chart['last_3_months']['points'][2]['period'])->toBe('2026-08')
            ->and($chart['last_3_months']['points'][2]['transactions'])->toBe(3)
            ->and($chart['last_3_months']['total_transactions'])->toBe(4)
            ->and($chart['last_3_months']['total_revenue'])->toBe(100000);
    } finally {
        Carbon::setTestNow();
    }
});

test('sidebar defaults collapsed and respects saved open preference', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('sidebarOpen', false)
            ->etc()
        );

    $this
        ->actingAs($user)
        ->withUnencryptedCookie('sidebar_state', 'true')
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('sidebarOpen', true)
            ->etc()
        );
});

function createDashboardOrder(
    User $cashier,
    string $invoiceNumber,
    string $status,
    ?string $paidAt,
    int $grandTotal,
): Order {
    return Order::query()->create([
        'queue_number' => Order::query()->count() + 1,
        'invoice_number' => $invoiceNumber,
        'customer_name' => null,
        'order_type' => 'dine_in',
        'subtotal' => $grandTotal,
        'grand_total' => $grandTotal,
        'payment_method' => $status === 'paid' ? 'cash' : null,
        'paid_amount' => $status === 'paid' ? $grandTotal : 0,
        'change_amount' => 0,
        'status' => $status,
        'cashier_id' => $cashier->id,
        'paid_at' => $paidAt === null ? null : Carbon::parse($paidAt),
    ]);
}
