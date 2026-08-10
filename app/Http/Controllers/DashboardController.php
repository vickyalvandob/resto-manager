<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as BaseCollection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * @phpstan-type TransactionChartPoint array{period: string, label: string, transactions: int, revenue: int}
 * @phpstan-type TransactionChartSeries array{label: string, total_transactions: int, total_revenue: int, points: array<int, TransactionChartPoint>}
 */
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
            'transactionChart' => $this->transactionChart(),
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

    /**
     * @return array{last_3_months: TransactionChartSeries, last_30_days: TransactionChartSeries, last_7_days: TransactionChartSeries}
     */
    private function transactionChart(): array
    {
        $now = CarbonImmutable::instance(now());
        $threeMonthStart = $now->subMonths(2)->startOfMonth();
        $dailyTotals = $this->dailyTransactionTotals($threeMonthStart, $now->endOfDay());
        $monthlyTotals = $this->monthlyTransactionTotals($dailyTotals);

        return [
            'last_3_months' => $this->monthlyTransactionSeries($monthlyTotals, $threeMonthStart, 3, 'Last 3 months'),
            'last_30_days' => $this->dailyTransactionSeries($dailyTotals, $now->subDays(29)->startOfDay(), 30, 'Last 30 days'),
            'last_7_days' => $this->dailyTransactionSeries($dailyTotals, $now->subDays(6)->startOfDay(), 7, 'Last 7 days'),
        ];
    }

    /**
     * @return BaseCollection<string, array{transactions: int, revenue: int}>
     */
    private function dailyTransactionTotals(CarbonImmutable $start, CarbonImmutable $end): BaseCollection
    {
        return Order::query()
            ->paid()
            ->whereBetween('paid_at', [$start, $end])
            ->toBase()
            ->selectRaw('date(paid_at) as period')
            ->selectRaw('count(*) as transactions')
            ->selectRaw('sum(grand_total) as revenue')
            ->groupBy('period')
            ->orderBy('period')
            ->get()
            ->mapWithKeys(fn (object $row): array => [
                (string) $row->period => [
                    'transactions' => (int) $row->transactions,
                    'revenue' => (int) round((float) $row->revenue),
                ],
            ]);
    }

    /**
     * @param  BaseCollection<string, array{transactions: int, revenue: int}>  $dailyTotals
     * @return BaseCollection<string, array{transactions: int, revenue: int}>
     */
    private function monthlyTransactionTotals(BaseCollection $dailyTotals): BaseCollection
    {
        return $dailyTotals
            ->groupBy(fn (array $total, string $period): string => CarbonImmutable::parse($period)->format('Y-m'))
            ->map(fn (BaseCollection $totals): array => [
                'transactions' => (int) $totals->sum('transactions'),
                'revenue' => (int) $totals->sum('revenue'),
            ]);
    }

    /**
     * @param  BaseCollection<string, array{transactions: int, revenue: int}>  $totals
     * @return TransactionChartSeries
     */
    private function dailyTransactionSeries(BaseCollection $totals, CarbonImmutable $start, int $days, string $label): array
    {
        $points = collect(range(0, $days - 1))
            ->map(function (int $offset) use ($start, $totals): array {
                $date = $start->addDays($offset);

                return $this->transactionChartPoint(
                    $date->toDateString(),
                    $date->format('M j'),
                    $totals->get($date->toDateString(), ['transactions' => 0, 'revenue' => 0]),
                );
            });

        return $this->transactionChartSeries($label, $points);
    }

    /**
     * @param  BaseCollection<string, array{transactions: int, revenue: int}>  $totals
     * @return TransactionChartSeries
     */
    private function monthlyTransactionSeries(BaseCollection $totals, CarbonImmutable $start, int $months, string $label): array
    {
        $points = collect(range(0, $months - 1))
            ->map(function (int $offset) use ($start, $totals): array {
                $month = $start->addMonths($offset);
                $period = $month->format('Y-m');

                return $this->transactionChartPoint(
                    $period,
                    $month->format('M Y'),
                    $totals->get($period, ['transactions' => 0, 'revenue' => 0]),
                );
            });

        return $this->transactionChartSeries($label, $points);
    }

    /**
     * @param  array{transactions: int, revenue: int}  $total
     * @return TransactionChartPoint
     */
    private function transactionChartPoint(string $period, string $label, array $total): array
    {
        return [
            'period' => $period,
            'label' => $label,
            'transactions' => $total['transactions'],
            'revenue' => $total['revenue'],
        ];
    }

    /**
     * @param  BaseCollection<int, TransactionChartPoint>  $points
     * @return TransactionChartSeries
     */
    private function transactionChartSeries(string $label, BaseCollection $points): array
    {
        $points = $points->values();

        return [
            'label' => $label,
            'total_transactions' => (int) $points->sum('transactions'),
            'total_revenue' => (int) $points->sum('revenue'),
            'points' => $points->all(),
        ];
    }
}
