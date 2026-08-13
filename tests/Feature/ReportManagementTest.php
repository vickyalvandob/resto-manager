<?php

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

test('reports index includes aggregate summary payment breakdown trend and normalized filters', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-13 12:00:00'));

    try {
        $admin = User::factory()->admin()->create();
        $cashier = User::factory()->cashier()->create();

        createReportOrder($cashier, 'INV-REPORT-001', 'cash', '2026-08-11 09:00:00', 10000);
        createReportOrder($cashier, 'INV-REPORT-002', 'qris', '2026-08-12 10:00:00', 30000);
        createReportOrder($cashier, 'INV-REPORT-003', 'transfer', '2026-08-13 11:00:00', 50000);
        createReportOrder($cashier, 'INV-REPORT-OLD', 'cash', '2026-07-30 11:00:00', 90000);
        createReportOpenOrder($cashier);

        $this
            ->actingAs($admin)
            ->get(route('reports.index', ['range' => 'this_week']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/index')
                ->where('filters.range', 'this_week')
                ->where('filters.from', '2026-08-10')
                ->where('filters.to', '2026-08-16')
                ->where('summary.total_revenue', 90000)
                ->where('summary.total_paid_transactions', 3)
                ->where('summary.average_transaction', 30000)
                ->where('paymentBreakdown.cash.count', 1)
                ->where('paymentBreakdown.cash.total', 10000)
                ->where('paymentBreakdown.qris.count', 1)
                ->where('paymentBreakdown.transfer.total', 50000)
                ->where('trend.granularity', 'daily')
                ->where('trend.total_revenue', 90000)
                ->has('trend.points', 7)
                ->where('trend.points.1.period', '2026-08-11')
                ->where('trend.points.1.revenue', 10000)
                ->where('orders.total', 3)
                ->where('orders.data.0.invoice_number', 'INV-REPORT-003')
                ->where('orders.data.0.queue_number', '003')
                ->where('orders.data.0.customer_name', 'Customer INV-REPORT-003')
                ->etc()
            );

        $this
            ->actingAs($admin)
            ->get(route('reports.index', [
                'range' => 'custom',
                'from' => '2026-08-13',
                'to' => '2026-08-11',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.from', '2026-08-11')
                ->where('filters.to', '2026-08-13')
                ->where('summary.total_revenue', 90000)
                ->where('orders.total', 3)
                ->etc()
            );
    } finally {
        Carbon::setTestNow();
    }
});

test('reports index page exposes optimized report sections and mobile cards', function () {
    $reportsPage = file_get_contents(resource_path('js/pages/reports/index.tsx'));

    expect($reportsPage)
        ->toContain('type ReportTrend =')
        ->toContain('TrendCard')
        ->toContain('PaymentBreakdownCard')
        ->toContain('TransactionCard')
        ->toContain('Omzet Paid')
        ->toContain('Metode Pembayaran')
        ->toContain('lg:hidden')
        ->toContain('hidden overflow-x-auto lg:block')
        ->toContain('visiblePaginationPages')
        ->toContain('queryParams({ ...filters, page })');
});

function createReportOrder(
    User $cashier,
    string $invoiceNumber,
    string $paymentMethod,
    string $paidAt,
    int $grandTotal,
): Order {
    $queueNumber = Order::query()->count() + 1;

    return Order::query()->create([
        'queue_number' => $queueNumber,
        'invoice_number' => $invoiceNumber,
        'customer_name' => "Customer {$invoiceNumber}",
        'order_type' => $queueNumber % 2 === 0 ? 'take_away' : 'dine_in',
        'subtotal' => $grandTotal,
        'grand_total' => $grandTotal,
        'payment_method' => $paymentMethod,
        'paid_amount' => $grandTotal,
        'change_amount' => 0,
        'status' => 'paid',
        'cashier_id' => $cashier->id,
        'paid_at' => Carbon::parse($paidAt),
    ]);
}

function createReportOpenOrder(User $cashier): Order
{
    return Order::query()->create([
        'queue_number' => Order::query()->count() + 1,
        'invoice_number' => 'INV-REPORT-OPEN',
        'customer_name' => 'Open Customer',
        'order_type' => 'dine_in',
        'subtotal' => 40000,
        'grand_total' => 40000,
        'payment_method' => null,
        'paid_amount' => 0,
        'change_amount' => 0,
        'status' => 'open',
        'cashier_id' => $cashier->id,
        'paid_at' => null,
    ]);
}
