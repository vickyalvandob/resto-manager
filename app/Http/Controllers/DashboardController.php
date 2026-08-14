<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection as BaseCollection;
use Inertia\Inertia;
use Inertia\Response;
use stdClass;

/**
 * @phpstan-type PaymentBreakdown array{cash: array{count: int, total: int}, qris: array{count: int, total: int}, transfer: array{count: int, total: int}}
 * @phpstan-type DashboardStats array{revenue: int, paid_transactions: int, open_orders: int, paid_orders: int, void_orders: int}
 * @phpstan-type TransactionChartPoint array{period: string, label: string, transactions: int, revenue: int}
 * @phpstan-type TransactionChartSeries array{label: string, total_transactions: int, total_revenue: int, points: array<int, TransactionChartPoint>}
 */
class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();
        $todayAggregate = $this->todayAggregate($todayStart, $todayEnd);

        return Inertia::render('dashboard', [
            'stats' => $this->statsPayload($todayAggregate),
            'paymentBreakdown' => $this->paymentBreakdownPayload($todayAggregate),
            'transactionChart' => $this->transactionChart(),
        ]);
    }

    private function todayAggregate(CarbonInterface $start, CarbonInterface $end): stdClass
    {
        return Order::query()
            ->where(function (Builder $query) use ($start, $end): void {
                $query
                    ->whereBetween('created_at', [$start, $end])
                    ->orWhereBetween('paid_at', [$start, $end]);
            })
            ->toBase()
            ->selectRaw('count(case when status = ? and created_at between ? and ? then 1 end) as open_orders', ['open', $start, $end])
            ->selectRaw('count(case when status = ? and created_at between ? and ? then 1 end) as paid_orders', ['paid', $start, $end])
            ->selectRaw('count(case when status = ? and created_at between ? and ? then 1 end) as void_orders', ['void', $start, $end])
            ->selectRaw('count(case when status = ? and paid_at between ? and ? then 1 end) as paid_transactions', ['paid', $start, $end])
            ->selectRaw('coalesce(sum(case when status = ? and paid_at between ? and ? then grand_total else 0 end), 0) as revenue', ['paid', $start, $end])
            ->selectRaw('count(case when status = ? and paid_at between ? and ? and payment_method = ? then 1 end) as cash_count', ['paid', $start, $end, 'cash'])
            ->selectRaw('coalesce(sum(case when status = ? and paid_at between ? and ? and payment_method = ? then grand_total else 0 end), 0) as cash_total', ['paid', $start, $end, 'cash'])
            ->selectRaw('count(case when status = ? and paid_at between ? and ? and payment_method = ? then 1 end) as qris_count', ['paid', $start, $end, 'qris'])
            ->selectRaw('coalesce(sum(case when status = ? and paid_at between ? and ? and payment_method = ? then grand_total else 0 end), 0) as qris_total', ['paid', $start, $end, 'qris'])
            ->selectRaw('count(case when status = ? and paid_at between ? and ? and payment_method = ? then 1 end) as transfer_count', ['paid', $start, $end, 'transfer'])
            ->selectRaw('coalesce(sum(case when status = ? and paid_at between ? and ? and payment_method = ? then grand_total else 0 end), 0) as transfer_total', ['paid', $start, $end, 'transfer'])
            ->first() ?? (object) [
                'open_orders' => 0,
                'paid_orders' => 0,
                'void_orders' => 0,
                'paid_transactions' => 0,
                'revenue' => 0,
                'cash_count' => 0,
                'cash_total' => 0,
                'qris_count' => 0,
                'qris_total' => 0,
                'transfer_count' => 0,
                'transfer_total' => 0,
            ];
    }

    /**
     * @return DashboardStats
     */
    private function statsPayload(stdClass $aggregate): array
    {
        return [
            'revenue' => (int) round((float) $aggregate->revenue),
            'paid_transactions' => (int) $aggregate->paid_transactions,
            'open_orders' => (int) $aggregate->open_orders,
            'paid_orders' => (int) $aggregate->paid_orders,
            'void_orders' => (int) $aggregate->void_orders,
        ];
    }

    /**
     * @return PaymentBreakdown
     */
    private function paymentBreakdownPayload(stdClass $aggregate): array
    {
        return [
            'cash' => [
                'count' => (int) $aggregate->cash_count,
                'total' => (int) round((float) $aggregate->cash_total),
            ],
            'qris' => [
                'count' => (int) $aggregate->qris_count,
                'total' => (int) round((float) $aggregate->qris_total),
            ],
            'transfer' => [
                'count' => (int) $aggregate->transfer_count,
                'total' => (int) round((float) $aggregate->transfer_total),
            ],
        ];
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
