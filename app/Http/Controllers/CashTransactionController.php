<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCashTransactionRequest;
use App\Models\CashTransaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * @phpstan-type CashTransactionFilters array{range: string, type: string, search: string, from: string, to: string}
 * @phpstan-type CashTransactionSummary array{total_income: int, total_expense: int, balance: int, total_transactions: int, income_count: int, expense_count: int}
 */
class CashTransactionController extends Controller
{
    private const RANGE_FILTERS = ['today', 'yesterday', 'this_week', 'this_month', 'custom'];

    private const TYPE_FILTERS = ['', CashTransaction::TYPE_INCOME, CashTransaction::TYPE_EXPENSE];

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', CashTransaction::class);

        $filters = $this->filters($request);
        [$start, $end] = $this->dateRange($filters);
        $query = $this->cashTransactionsQuery($filters, $start, $end);

        $transactions = (clone $query)
            ->select(['id', 'user_id', 'transaction_date', 'type', 'category', 'payment_method', 'amount', 'description', 'created_at'])
            ->with('user:id,name')
            ->latest('transaction_date')
            ->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (CashTransaction $cashTransaction): array => $this->cashTransactionPayload($cashTransaction));

        return Inertia::render('cash-transactions/index', [
            'filters' => [
                ...$filters,
                'from' => $start->toDateString(),
                'to' => $end->toDateString(),
            ],
            'summary' => $this->summaryPayload(clone $query),
            'categoryBreakdown' => $this->categoryBreakdownPayload(clone $query),
            'transactions' => $transactions,
            'typeOptions' => $this->typeOptions(),
            'paymentOptions' => $this->paymentOptions(),
            'categoryOptions' => $this->categoryOptions(),
            'today' => now()->toDateString(),
        ]);
    }

    public function store(StoreCashTransactionRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $user = $request->user();
        $transactionDate = CarbonImmutable::parse((string) $data['transaction_date'])->toDateString();

        abort_unless($user instanceof User, 403);

        CashTransaction::query()->create([
            ...$data,
            'transaction_date' => $transactionDate,
            'user_id' => $user->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Transaksi kas ditambahkan.')]);

        return to_route('cash-transactions.index', $this->redirectFiltersForDate($transactionDate));
    }

    public function destroy(CashTransaction $cashTransaction): RedirectResponse
    {
        Gate::authorize('delete', $cashTransaction);

        $cashTransaction->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Transaksi kas dihapus.')]);

        return back();
    }

    /**
     * @return CashTransactionFilters
     */
    private function filters(Request $request): array
    {
        $range = (string) $request->query('range', 'today');
        $type = (string) $request->query('type', '');

        if (! in_array($range, self::RANGE_FILTERS, true)) {
            $range = 'today';
        }

        if (! in_array($type, self::TYPE_FILTERS, true)) {
            $type = '';
        }

        return [
            'range' => $range,
            'type' => $type,
            'search' => trim((string) $request->query('search', '')),
            'from' => (string) $request->query('from', ''),
            'to' => (string) $request->query('to', ''),
        ];
    }

    /**
     * @param  CashTransactionFilters  $filters
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
     * @param  CashTransactionFilters  $filters
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function customDateRange(array $filters, CarbonImmutable $fallbackDate): array
    {
        $start = $this->dateFromInput($filters['from'], $fallbackDate)->startOfDay();
        $end = $this->dateFromInput($filters['to'], $fallbackDate)->endOfDay();

        if ($start->greaterThan($end)) {
            return [$end->startOfDay(), $start->endOfDay()];
        }

        return [$start, $end];
    }

    private function dateFromInput(string $date, CarbonImmutable $fallbackDate): CarbonImmutable
    {
        try {
            return CarbonImmutable::parse($date ?: $fallbackDate->toDateString());
        } catch (Throwable) {
            return $fallbackDate;
        }
    }

    /**
     * @param  CashTransactionFilters  $filters
     * @return Builder<CashTransaction>
     */
    private function cashTransactionsQuery(array $filters, CarbonInterface $start, CarbonInterface $end): Builder
    {
        return CashTransaction::query()
            ->whereDate('transaction_date', '>=', $start->toDateString())
            ->whereDate('transaction_date', '<=', $end->toDateString())
            ->when($filters['type'] !== '', fn (Builder $query) => $query->where('type', $filters['type']))
            ->when($filters['search'] !== '', function (Builder $query) use ($filters): void {
                $search = $filters['search'];

                $query->where(function (Builder $query) use ($search): void {
                    $query
                        ->where('category', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            });
    }

    /**
     * @param  Builder<CashTransaction>  $query
     * @return CashTransactionSummary
     */
    private function summaryPayload(Builder $query): array
    {
        $aggregate = $query
            ->toBase()
            ->selectRaw('count(*) as total_transactions')
            ->selectRaw('count(case when type = ? then 1 end) as income_count', [CashTransaction::TYPE_INCOME])
            ->selectRaw('count(case when type = ? then 1 end) as expense_count', [CashTransaction::TYPE_EXPENSE])
            ->selectRaw('coalesce(sum(case when type = ? then amount else 0 end), 0) as total_income', [CashTransaction::TYPE_INCOME])
            ->selectRaw('coalesce(sum(case when type = ? then amount else 0 end), 0) as total_expense', [CashTransaction::TYPE_EXPENSE])
            ->first();

        $totalIncome = (int) ($aggregate->total_income ?? 0);
        $totalExpense = (int) ($aggregate->total_expense ?? 0);

        return [
            'total_income' => $totalIncome,
            'total_expense' => $totalExpense,
            'balance' => $totalIncome - $totalExpense,
            'total_transactions' => (int) ($aggregate->total_transactions ?? 0),
            'income_count' => (int) ($aggregate->income_count ?? 0),
            'expense_count' => (int) ($aggregate->expense_count ?? 0),
        ];
    }

    /**
     * @param  Builder<CashTransaction>  $query
     * @return array<int, array{type: string, category: string, total: int, transactions: int}>
     */
    private function categoryBreakdownPayload(Builder $query): array
    {
        return $query
            ->toBase()
            ->select(['type', 'category'])
            ->selectRaw('count(*) as transactions')
            ->selectRaw('coalesce(sum(amount), 0) as total')
            ->groupBy('type', 'category')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(fn (object $row): array => [
                'type' => (string) $row->type,
                'category' => (string) $row->category,
                'total' => (int) $row->total,
                'transactions' => (int) $row->transactions,
            ])
            ->all();
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function typeOptions(): array
    {
        return [
            ['value' => CashTransaction::TYPE_INCOME, 'label' => 'Pemasukan'],
            ['value' => CashTransaction::TYPE_EXPENSE, 'label' => 'Pengeluaran'],
        ];
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function paymentOptions(): array
    {
        return [
            ['value' => 'cash', 'label' => 'Tunai'],
            ['value' => 'qris', 'label' => 'QRIS'],
            ['value' => 'transfer', 'label' => 'Transfer'],
        ];
    }

    /**
     * @return array<int, array{type: string, items: array<int, array{value: string, label: string}>}>
     */
    private function categoryOptions(): array
    {
        return collect(CashTransaction::categories())
            ->map(fn (array $categories, string $type): array => [
                'type' => $type,
                'items' => array_map(fn (string $category): array => [
                    'value' => $category,
                    'label' => $category,
                ], $categories),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, string>
     */
    private function redirectFiltersForDate(string $transactionDate): array
    {
        if ($transactionDate === now()->toDateString()) {
            return [];
        }

        return [
            'range' => 'custom',
            'from' => $transactionDate,
            'to' => $transactionDate,
        ];
    }

    /**
     * @return array{id: int, transaction_date: string, type: string, category: string, payment_method: string, amount: int, description: string|null, created_at: string|null, user: array{id: int, name: string}}
     */
    private function cashTransactionPayload(CashTransaction $cashTransaction): array
    {
        return [
            'id' => $cashTransaction->id,
            'transaction_date' => $cashTransaction->transaction_date->toDateString(),
            'type' => $cashTransaction->type,
            'category' => $cashTransaction->category,
            'payment_method' => $cashTransaction->payment_method,
            'amount' => $cashTransaction->amount,
            'description' => $cashTransaction->description,
            'created_at' => $cashTransaction->created_at?->toISOString(),
            'user' => [
                'id' => $cashTransaction->user->id,
                'name' => $cashTransaction->user->name,
            ],
        ];
    }
}
