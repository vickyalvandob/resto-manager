<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $filters = [
            'range' => (string) $request->query('range', 'today'),
            'from' => (string) $request->query('from', ''),
            'to' => (string) $request->query('to', ''),
        ];
        [$start, $end] = $this->dateRange($filters);

        $paidOrders = Order::query()
            ->paid()
            ->whereBetween('paid_at', [$start, $end]);

        $totalRevenue = (int) round((float) (clone $paidOrders)->sum('grand_total'));
        $totalTransactions = (clone $paidOrders)->count();

        $orders = (clone $paidOrders)
            ->select(['id', 'invoice_number', 'cashier_id', 'payment_method', 'grand_total', 'paid_at'])
            ->with('cashier:id,name,email,role')
            ->latest('paid_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Order $order): array => [
                'id' => $order->id,
                'invoice_number' => $order->invoice_number,
                'date' => $order->paid_at?->toISOString(),
                'cashier' => ['name' => $order->cashier->name],
                'payment_method' => $order->payment_method,
                'grand_total' => (int) round((float) $order->grand_total),
            ]);

        return Inertia::render('reports/index', [
            'filters' => [
                ...$filters,
                'from' => $start->toDateString(),
                'to' => $end->toDateString(),
            ],
            'summary' => [
                'total_revenue' => $totalRevenue,
                'total_paid_transactions' => $totalTransactions,
                'average_transaction' => $totalTransactions > 0 ? (int) round($totalRevenue / $totalTransactions) : 0,
            ],
            'paymentBreakdown' => $this->paymentBreakdown((clone $paidOrders)->get(['payment_method', 'grand_total'])),
            'orders' => $orders,
        ]);
    }

    /**
     * @param  array{range: string, from: string, to: string}  $filters
     * @return array{0: CarbonInterface, 1: CarbonInterface}
     */
    private function dateRange(array $filters): array
    {
        return match ($filters['range']) {
            'yesterday' => [now()->subDay()->startOfDay(), now()->subDay()->endOfDay()],
            'this_week' => [now()->startOfWeek()->startOfDay(), now()->endOfWeek()->endOfDay()],
            'this_month' => [now()->startOfMonth()->startOfDay(), now()->endOfMonth()->endOfDay()],
            'custom' => [
                CarbonImmutable::parse($filters['from'] ?: now()->toDateString())->startOfDay(),
                CarbonImmutable::parse($filters['to'] ?: now()->toDateString())->endOfDay(),
            ],
            default => [now()->startOfDay(), now()->endOfDay()],
        };
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
