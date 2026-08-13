<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection as BaseCollection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * @phpstan-type PaymentBreakdown array{cash: array{count: int, total: int}, qris: array{count: int, total: int}, transfer: array{count: int, total: int}}
 * @phpstan-type ReportTrendPoint array{period: string, label: string, transactions: int, revenue: int}
 * @phpstan-type ReportTrend array{label: string, granularity: string, total_transactions: int, total_revenue: int, points: array<int, ReportTrendPoint>}
 */
class ReportController extends Controller
{
    private const RANGE_FILTERS = ['today', 'yesterday', 'this_week', 'this_month', 'custom'];

    public function __invoke(Request $request): Response
    {
        $filters = $this->filters($request);
        [$start, $end] = $this->dateRange($filters);
        $paidOrders = $this->paidOrdersQuery($start, $end);
        $summary = $this->summaryPayload(clone $paidOrders);
        $dailyTotals = $this->dailyTransactionTotals($start, $end);

        $orders = (clone $paidOrders)
            ->select([
                'id',
                'queue_number',
                'invoice_number',
                'customer_name',
                'order_type',
                'cashier_id',
                'payment_method',
                'grand_total',
                'paid_at',
            ])
            ->with('cashier:id,name')
            ->latest('paid_at')
            ->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Order $order): array => $this->orderPayload($order));

        return Inertia::render('reports/index', [
            'filters' => [
                ...$filters,
                'from' => $start->toDateString(),
                'to' => $end->toDateString(),
            ],
            'summary' => $summary,
            'paymentBreakdown' => $this->paymentBreakdown(clone $paidOrders),
            'trend' => $this->trendPayload($dailyTotals, $start, $end, $summary),
            'orders' => $orders,
        ]);
    }

    /**
     * @return array{range: string, from: string, to: string}
     */
    private function filters(Request $request): array
    {
        $range = (string) $request->query('range', 'today');

        if (! in_array($range, self::RANGE_FILTERS, true)) {
            $range = 'today';
        }

        return [
            'range' => $range,
            'from' => (string) $request->query('from', ''),
            'to' => (string) $request->query('to', ''),
        ];
    }

    /**
     * @param  array{range: string, from: string, to: string}  $filters
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function dateRange(array $filters): array
    {
        $now = CarbonImmutable::instance(now());

        return match ($filters['range']) {
            'yesterday' => [$now->subDay()->startOfDay(), $now->subDay()->endOfDay()],
            'this_week' => [$now->startOfWeek()->startOfDay(), $now->endOfWeek()->endOfDay()],
            'this_month' => [$now->startOfMonth()->startOfDay(), $now->endOfMonth()->endOfDay()],
            'custom' => $this->customDateRange($filters, $now),
            default => [$now->startOfDay(), $now->endOfDay()],
        };
    }

    /**
     * @param  array{range: string, from: string, to: string}  $filters
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function customDateRange(array $filters, CarbonImmutable $fallbackDate): array
    {
        $start = CarbonImmutable::parse($filters['from'] ?: $fallbackDate->toDateString())->startOfDay();
        $end = CarbonImmutable::parse($filters['to'] ?: $fallbackDate->toDateString())->endOfDay();

        if ($start->greaterThan($end)) {
            return [$end->startOfDay(), $start->endOfDay()];
        }

        return [$start, $end];
    }

    /**
     * @return Builder<Order>
     */
    private function paidOrdersQuery(CarbonInterface $start, CarbonInterface $end): Builder
    {
        return Order::query()
            ->paid()
            ->whereBetween('paid_at', [$start, $end]);
    }

    /**
     * @param  Builder<Order>  $query
     * @return array{total_revenue: int, total_paid_transactions: int, average_transaction: int}
     */
    private function summaryPayload(Builder $query): array
    {
        $summary = $query
            ->toBase()
            ->selectRaw('count(*) as total_paid_transactions')
            ->selectRaw('coalesce(sum(grand_total), 0) as total_revenue')
            ->first();

        $totalRevenue = (int) round((float) $summary->total_revenue);
        $totalTransactions = (int) $summary->total_paid_transactions;

        return [
            'total_revenue' => $totalRevenue,
            'total_paid_transactions' => $totalTransactions,
            'average_transaction' => $totalTransactions > 0 ? (int) round($totalRevenue / $totalTransactions) : 0,
        ];
    }

    /**
     * @param  Builder<Order>  $query
     * @return PaymentBreakdown
     */
    private function paymentBreakdown(Builder $query): array
    {
        $totals = $query
            ->toBase()
            ->selectRaw('payment_method')
            ->selectRaw('count(*) as count')
            ->selectRaw('coalesce(sum(grand_total), 0) as total')
            ->groupBy('payment_method')
            ->get()
            ->keyBy('payment_method');
        $cash = $totals->get('cash');
        $qris = $totals->get('qris');
        $transfer = $totals->get('transfer');

        return [
            'cash' => [
                'count' => (int) ($cash->count ?? 0),
                'total' => (int) round((float) ($cash->total ?? 0)),
            ],
            'qris' => [
                'count' => (int) ($qris->count ?? 0),
                'total' => (int) round((float) ($qris->total ?? 0)),
            ],
            'transfer' => [
                'count' => (int) ($transfer->count ?? 0),
                'total' => (int) round((float) ($transfer->total ?? 0)),
            ],
        ];
    }

    /**
     * @return BaseCollection<string, array{transactions: int, revenue: int}>
     */
    private function dailyTransactionTotals(CarbonInterface $start, CarbonInterface $end): BaseCollection
    {
        return Order::query()
            ->paid()
            ->whereBetween('paid_at', [$start, $end])
            ->toBase()
            ->selectRaw('date(paid_at) as period')
            ->selectRaw('count(*) as transactions')
            ->selectRaw('coalesce(sum(grand_total), 0) as revenue')
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
     * @param  array{total_revenue: int, total_paid_transactions: int, average_transaction: int}  $summary
     * @return ReportTrend
     */
    private function trendPayload(BaseCollection $dailyTotals, CarbonImmutable $start, CarbonImmutable $end, array $summary): array
    {
        $days = (int) $start->startOfDay()->diffInDays($end->startOfDay()) + 1;

        if ($days > 31) {
            return $this->monthlyTrendPayload($dailyTotals, $start, $end, $summary);
        }

        $points = collect(range(0, $days - 1))
            ->map(function (int $offset) use ($dailyTotals, $start): array {
                $date = $start->addDays($offset);

                return $this->trendPoint(
                    $date->toDateString(),
                    $date->format('M j'),
                    $dailyTotals->get($date->toDateString(), ['transactions' => 0, 'revenue' => 0]),
                );
            })
            ->values();

        return [
            'label' => 'Revenue by day',
            'granularity' => 'daily',
            'total_transactions' => $summary['total_paid_transactions'],
            'total_revenue' => $summary['total_revenue'],
            'points' => $points->all(),
        ];
    }

    /**
     * @param  BaseCollection<string, array{transactions: int, revenue: int}>  $dailyTotals
     * @param  array{total_revenue: int, total_paid_transactions: int, average_transaction: int}  $summary
     * @return ReportTrend
     */
    private function monthlyTrendPayload(BaseCollection $dailyTotals, CarbonImmutable $start, CarbonImmutable $end, array $summary): array
    {
        $monthlyTotals = $dailyTotals
            ->groupBy(fn (array $total, string $period): string => CarbonImmutable::parse($period)->format('Y-m'))
            ->map(fn (BaseCollection $totals): array => [
                'transactions' => (int) $totals->sum('transactions'),
                'revenue' => (int) $totals->sum('revenue'),
            ]);
        $startMonth = $start->startOfMonth();
        $months = (int) $startMonth->diffInMonths($end->startOfMonth()) + 1;
        $points = collect(range(0, $months - 1))
            ->map(function (int $offset) use ($monthlyTotals, $startMonth): array {
                $month = $startMonth->addMonths($offset);
                $period = $month->format('Y-m');

                return $this->trendPoint(
                    $period,
                    $month->format('M Y'),
                    $monthlyTotals->get($period, ['transactions' => 0, 'revenue' => 0]),
                );
            })
            ->values();

        return [
            'label' => 'Revenue by month',
            'granularity' => 'monthly',
            'total_transactions' => $summary['total_paid_transactions'],
            'total_revenue' => $summary['total_revenue'],
            'points' => $points->all(),
        ];
    }

    /**
     * @param  array{transactions: int, revenue: int}  $total
     * @return ReportTrendPoint
     */
    private function trendPoint(string $period, string $label, array $total): array
    {
        return [
            'period' => $period,
            'label' => $label,
            'transactions' => $total['transactions'],
            'revenue' => $total['revenue'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function orderPayload(Order $order): array
    {
        return [
            'id' => $order->id,
            'queue_number' => $order->formattedQueueNumber(),
            'invoice_number' => $order->invoice_number,
            'customer_name' => $order->customer_name,
            'order_type' => $order->order_type,
            'date' => $order->paid_at?->toISOString(),
            'cashier' => [
                'id' => $order->cashier->id,
                'name' => $order->cashier->name,
            ],
            'payment_method' => $order->payment_method,
            'grand_total' => (int) round((float) $order->grand_total),
        ];
    }
}
