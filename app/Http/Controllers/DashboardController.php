<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Database\Eloquent\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $today = [now()->startOfDay(), now()->endOfDay()];

        $paidToday = Order::query()
            ->paid()
            ->whereBetween('paid_at', $today);

        $stats = [
            'revenue' => (int) round((float) (clone $paidToday)->sum('grand_total')),
            'paid_transactions' => (clone $paidToday)->count(),
            'open_orders' => Order::query()->where('status', 'open')->whereBetween('created_at', $today)->count(),
            'paid_orders' => Order::query()->where('status', 'paid')->whereBetween('created_at', $today)->count(),
            'void_orders' => Order::query()->where('status', 'void')->whereBetween('created_at', $today)->count(),
        ];

        return Inertia::render('dashboard', [
            'stats' => $stats,
            'paymentBreakdown' => $this->paymentBreakdown((clone $paidToday)->get(['payment_method', 'grand_total'])),
        ]);
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @return array<string, array{count: int, total: int}>
     */
    private function paymentBreakdown(Collection $orders): array
    {
        return collect(['cash', 'qris', 'transfer'])
            ->mapWithKeys(fn (string $paymentMethod): array => [
                $paymentMethod => [
                    'count' => $orders->where('payment_method', $paymentMethod)->count(),
                    'total' => (int) round((float) $orders->where('payment_method', $paymentMethod)->sum('grand_total')),
                ],
            ])
            ->all();
    }
}
