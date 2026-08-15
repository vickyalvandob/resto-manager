import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Landmark,
    NotebookText,
    PlusCircle,
    RotateCcw,
    Save,
    Search,
    Trash2,
    WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
    destroy as destroyCashTransaction,
    store as storeCashTransaction,
} from '@/actions/App/Http/Controllers/CashTransactionController';
import InputError from '@/components/input-error';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatRupiah } from '@/lib/currency';
import { formatDate, formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { index as cashTransactionsIndex } from '@/routes/cash-transactions';
import type { PaginatedData } from '@/types';

type CashTransactionType = 'income' | 'expense';
type CashTransactionTypeFilter = '' | CashTransactionType;
type CashRange = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';
type CashPaymentMethod = 'cash' | 'qris' | 'transfer';

type SelectOption<TValue extends string = string> = {
    value: TValue;
    label: string;
};

type CashTransactionFilters = {
    range: CashRange;
    type: CashTransactionTypeFilter;
    search: string;
    from: string;
    to: string;
};

type CashTransactionSummary = {
    total_income: number;
    total_expense: number;
    balance: number;
    total_transactions: number;
    income_count: number;
    expense_count: number;
};

type CashTransactionItem = {
    id: number;
    transaction_date: string;
    type: CashTransactionType;
    category: string;
    payment_method: CashPaymentMethod;
    amount: number;
    description: string | null;
    created_at: string | null;
    user: {
        id: number;
        name: string;
    };
};

type CashCategoryOptions = {
    type: CashTransactionType;
    items: SelectOption[];
};

type CashCategoryBreakdownItem = {
    type: CashTransactionType;
    category: string;
    total: number;
    transactions: number;
};

type CashTransactionFormData = {
    transaction_date: string;
    type: CashTransactionType;
    category: string;
    payment_method: CashPaymentMethod;
    amount: string;
    description: string;
};

type CashTransactionsIndexProps = {
    filters: CashTransactionFilters;
    summary: CashTransactionSummary;
    categoryBreakdown: CashCategoryBreakdownItem[];
    transactions: PaginatedData<CashTransactionItem>;
    typeOptions: SelectOption<CashTransactionType>[];
    paymentOptions: SelectOption<CashPaymentMethod>[];
    categoryOptions: CashCategoryOptions[];
    today: string;
};

const rangeOptions: Array<{ value: CashRange; label: string }> = [
    { value: 'today', label: 'Hari ini' },
    { value: 'yesterday', label: 'Kemarin' },
    { value: 'this_week', label: 'Minggu ini' },
    { value: 'this_month', label: 'Bulan ini' },
    { value: 'custom', label: 'Custom' },
];

const typeIcons: Record<CashTransactionType, LucideIcon> = {
    income: ArrowUpCircle,
    expense: ArrowDownCircle,
};

const typeLabels: Record<CashTransactionType, string> = {
    income: 'Pemasukan',
    expense: 'Pengeluaran',
};

function rangeLabel(range: CashRange): string {
    return (
        rangeOptions.find((option) => option.value === range)?.label ??
        'Hari ini'
    );
}

function optionLabel<TValue extends string>(
    options: SelectOption<TValue>[],
    value: TValue,
): string {
    return options.find((option) => option.value === value)?.label ?? value;
}

function firstCategory(
    categoryOptions: CashCategoryOptions[],
    type: CashTransactionType,
): string {
    return (
        categoryOptions.find((option) => option.type === type)?.items[0]
            ?.value ?? ''
    );
}

function categoriesForType(
    categoryOptions: CashCategoryOptions[],
    type: CashTransactionType,
): SelectOption[] {
    return categoryOptions.find((option) => option.type === type)?.items ?? [];
}

function transactionFormDefaults(
    today: string,
    type: CashTransactionType,
    categoryOptions: CashCategoryOptions[],
): CashTransactionFormData {
    return {
        transaction_date: today,
        type,
        category: firstCategory(categoryOptions, type),
        payment_method: 'cash',
        amount: '',
        description: '',
    };
}

function queryParams({
    range,
    type,
    search,
    from,
    to,
    page,
}: CashTransactionFilters & { page?: number }): {
    range: CashRange;
    type?: CashTransactionType;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
} {
    return {
        range,
        type: type || undefined,
        search: search.trim() || undefined,
        from: range === 'custom' ? from : undefined,
        to: range === 'custom' ? to : undefined,
        page,
    };
}

export default function CashTransactionsIndex({
    filters,
    summary,
    categoryBreakdown,
    transactions,
    typeOptions,
    paymentOptions,
    categoryOptions,
    today,
}: CashTransactionsIndexProps) {
    const [range, setRange] = useState<CashRange>(filters.range);
    const [type, setType] = useState<CashTransactionTypeFilter>(filters.type);
    const [search, setSearch] = useState(filters.search);
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [entryDialogOpen, setEntryDialogOpen] = useState(false);
    const [entryDialogType, setEntryDialogType] =
        useState<CashTransactionType>('income');
    const visiblePages = useMemo(
        () =>
            visiblePaginationPages(
                transactions.current_page,
                transactions.last_page,
            ),
        [transactions.current_page, transactions.last_page],
    );

    const activeFilters: CashTransactionFilters = {
        range,
        type,
        search,
        from,
        to,
    };
    const periodLabel =
        filters.range === 'custom'
            ? `${filters.from} sampai ${filters.to}`
            : rangeLabel(filters.range);
    const hasActiveFilters =
        filters.range !== 'today' ||
        filters.type !== '' ||
        filters.search.trim() !== '';

    function visitCashTransactions(nextFilters: CashTransactionFilters): void {
        router.get(cashTransactionsIndex(), queryParams(nextFilters), {
            preserveScroll: true,
            preserveState: true,
        });
    }

    function submitFilters(event?: FormEvent<HTMLFormElement>): void {
        event?.preventDefault();
        visitCashTransactions({
            range,
            type,
            search: search.trim(),
            from,
            to,
        });
    }

    function selectRange(nextRange: CashRange): void {
        setRange(nextRange);

        if (nextRange !== 'custom') {
            visitCashTransactions({
                range: nextRange,
                type,
                search: search.trim(),
                from,
                to,
            });
        }
    }

    function selectType(nextType: CashTransactionTypeFilter): void {
        setType(nextType);
        visitCashTransactions({
            range,
            type: nextType,
            search: search.trim(),
            from,
            to,
        });
    }

    function openEntryDialog(defaultType: CashTransactionType): void {
        setEntryDialogType(defaultType);
        setEntryDialogOpen(true);
    }

    return (
        <>
            <Head title="Arus Kas" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold">Arus Kas</h1>
                        <p className="text-sm text-muted-foreground">
                            Pantau pemasukan, pengeluaran, dan saldo kas manual
                            di luar POS.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="grid grid-cols-2 gap-2 sm:flex">
                            <Button
                                type="button"
                                variant="outline"
                                className="min-w-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900/70 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                                onClick={() => openEntryDialog('income')}
                            >
                                <PlusCircle />
                                <span className="hidden sm:inline">
                                    Tambah Pemasukan
                                </span>
                                <span className="truncate sm:hidden">
                                    Pemasukan
                                </span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="min-w-0 border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/50"
                                onClick={() => openEntryDialog('expense')}
                            >
                                <PlusCircle />
                                <span className="hidden sm:inline">
                                    Tambah Pengeluaran
                                </span>
                                <span className="truncate sm:hidden">
                                    Pengeluaran
                                </span>
                            </Button>
                        </div>
                    </div>
                </div>

                <TransactionEntryDialog
                    open={entryDialogOpen}
                    onOpenChange={setEntryDialogOpen}
                    defaultType={entryDialogType}
                    today={today}
                    typeOptions={typeOptions}
                    paymentOptions={paymentOptions}
                    categoryOptions={categoryOptions}
                />

                <TypeFilterPanel
                    type={type}
                    typeOptions={typeOptions}
                    onSelectType={selectType}
                />

                <DateFilterPanel
                    range={range}
                    from={from}
                    to={to}
                    periodLabel={periodLabel}
                    hasActiveFilters={hasActiveFilters}
                    onFromChange={setFrom}
                    onToChange={setTo}
                    onSubmit={submitFilters}
                    onSelectRange={selectRange}
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric
                        label="Pemasukan"
                        value={formatRupiah(summary.total_income)}
                        detail={`${summary.income_count} transaksi`}
                        icon={ArrowUpCircle}
                        valueClassName="text-emerald-600 dark:text-emerald-400"
                    />
                    <Metric
                        label="Pengeluaran"
                        value={formatRupiah(summary.total_expense)}
                        detail={`${summary.expense_count} transaksi`}
                        icon={ArrowDownCircle}
                        valueClassName="text-rose-600 dark:text-rose-400"
                    />
                    <Metric
                        label="Selisih Kas"
                        value={formatRupiah(summary.balance)}
                        detail={periodLabel}
                        icon={Landmark}
                        valueClassName={
                            summary.balance < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-foreground'
                        }
                    />
                    <Metric
                        label="Total Input"
                        value={String(summary.total_transactions)}
                        detail="Transaksi manual"
                        icon={NotebookText}
                    />
                </div>

                <section className="overflow-hidden rounded-lg border border-border/70 bg-background">
                    <div className="grid gap-3 border-b px-4 py-3">
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="font-semibold">
                                    Daftar Transaksi
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {transactions.total > 0
                                        ? `Menampilkan ${transactions.from} sampai ${transactions.to} dari ${transactions.total} transaksi`
                                        : 'Belum ada transaksi untuk filter ini'}
                                </p>
                            </div>
                        </div>

                        <form
                            onSubmit={submitFilters}
                            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end lg:max-w-2xl"
                        >
                            <div className="grid gap-2">
                                <Label htmlFor="cash_search">Cari</Label>
                                <div className="relative">
                                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="cash_search"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="Kategori atau catatan"
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <Button type="submit">
                                <Search />
                                Terapkan
                            </Button>
                        </form>
                    </div>

                    <div className="grid gap-3 p-3 lg:hidden">
                        {transactions.data.length > 0 ? (
                            transactions.data.map((transaction) => (
                                <TransactionCard
                                    key={transaction.id}
                                    transaction={transaction}
                                    paymentOptions={paymentOptions}
                                />
                            ))
                        ) : (
                            <EmptyTransactions />
                        )}
                    </div>

                    <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3">Tanggal</th>
                                    <th className="px-4 py-3">Jenis</th>
                                    <th className="px-4 py-3">Kategori</th>
                                    <th className="px-4 py-3">Catatan</th>
                                    <th className="px-4 py-3">Metode</th>
                                    <th className="px-4 py-3">Dicatat</th>
                                    <th className="px-4 py-3 text-right">
                                        Nominal
                                    </th>
                                    <th className="w-20 px-4 py-3 text-right">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {transactions.data.length > 0 ? (
                                    transactions.data.map((transaction) => (
                                        <TransactionRow
                                            key={transaction.id}
                                            transaction={transaction}
                                            paymentOptions={paymentOptions}
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8}>
                                            <EmptyTransactions />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {transactions.total > 0 && (
                        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Halaman {transactions.current_page} dari{' '}
                                {transactions.last_page}
                            </p>
                            <div className="flex items-center gap-1 overflow-x-auto">
                                <PaginationButton
                                    page={transactions.current_page - 1}
                                    disabled={transactions.current_page === 1}
                                    filters={activeFilters}
                                    ariaLabel="Halaman sebelumnya"
                                >
                                    <ChevronLeft />
                                </PaginationButton>
                                {visiblePages.map((page) => (
                                    <PaginationButton
                                        key={page}
                                        page={page}
                                        active={
                                            page === transactions.current_page
                                        }
                                        filters={activeFilters}
                                    >
                                        {page}
                                    </PaginationButton>
                                ))}
                                <PaginationButton
                                    page={transactions.current_page + 1}
                                    disabled={
                                        transactions.current_page ===
                                        transactions.last_page
                                    }
                                    filters={activeFilters}
                                    ariaLabel="Halaman berikutnya"
                                >
                                    <ChevronRight />
                                </PaginationButton>
                            </div>
                        </div>
                    )}
                </section>

                <CategoryBreakdownCard items={categoryBreakdown} />
            </div>
        </>
    );
}

CashTransactionsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Arus Kas',
            href: cashTransactionsIndex(),
        },
    ],
};

function TypeFilterPanel({
    type,
    typeOptions,
    onSelectType,
}: {
    type: CashTransactionTypeFilter;
    typeOptions: SelectOption<CashTransactionType>[];
    onSelectType: (type: CashTransactionTypeFilter) => void;
}) {
    return (
        <section className="overflow-hidden rounded-lg border border-border/70 bg-background shadow-xs">
            <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <NotebookText className="size-4" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold">
                            Jenis Transaksi
                        </h2>
                        <p className="truncate text-xs text-muted-foreground">
                            Pilih semua, pemasukan, atau pengeluaran.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1 lg:min-w-[28rem]">
                    <TypeFilterButton
                        label="Semua"
                        active={type === ''}
                        onClick={() => onSelectType('')}
                    />
                    {typeOptions.map((option) => (
                        <TypeFilterButton
                            key={option.value}
                            label={option.label}
                            active={type === option.value}
                            icon={typeIcons[option.value]}
                            onClick={() => onSelectType(option.value)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

function DateFilterPanel({
    range,
    from,
    to,
    periodLabel,
    hasActiveFilters,
    onFromChange,
    onToChange,
    onSubmit,
    onSelectRange,
}: {
    range: CashRange;
    from: string;
    to: string;
    periodLabel: string;
    hasActiveFilters: boolean;
    onFromChange: (from: string) => void;
    onToChange: (to: string) => void;
    onSubmit: (event?: FormEvent<HTMLFormElement>) => void;
    onSelectRange: (range: CashRange) => void;
}) {
    return (
        <section className="overflow-hidden rounded-lg border border-border/70 bg-background shadow-xs">
            <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <CalendarDays className="size-4" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold">
                            Filter Tanggal
                        </h2>
                        <p className="truncate text-xs text-muted-foreground">
                            {periodLabel}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 sm:grid-cols-5 lg:min-w-[34rem]">
                    {rangeOptions.map((option) => {
                        const isActive = range === option.value;

                        return (
                            <Button
                                key={option.value}
                                type="button"
                                variant="ghost"
                                className={cn(
                                    'h-8 min-w-0 px-2 text-muted-foreground hover:bg-background/70 hover:text-foreground',
                                    isActive &&
                                        'bg-background text-foreground shadow-xs hover:bg-background',
                                )}
                                onClick={() => onSelectRange(option.value)}
                            >
                                <span className="truncate">{option.label}</span>
                            </Button>
                        );
                    })}
                </div>
            </div>

            {range === 'custom' && (
                <div className="grid gap-3 border-b bg-muted/20 px-4 py-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,12rem)_auto] sm:items-end">
                    <div className="grid gap-2">
                        <Label htmlFor="cash_from">Dari</Label>
                        <Input
                            id="cash_from"
                            type="date"
                            value={from}
                            onChange={(event) =>
                                onFromChange(event.target.value)
                            }
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="cash_to">Sampai</Label>
                        <Input
                            id="cash_to"
                            type="date"
                            value={to}
                            onChange={(event) => onToChange(event.target.value)}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onSubmit()}
                    >
                        Terapkan Tanggal
                    </Button>
                </div>
            )}

            {hasActiveFilters && (
                <div className="flex justify-end px-4 py-3">
                    <Button variant="outline" asChild>
                        <Link href={cashTransactionsIndex()}>
                            <RotateCcw />
                            Reset Filter
                        </Link>
                    </Button>
                </div>
            )}
        </section>
    );
}

function TransactionEntryDialog({
    open,
    onOpenChange,
    defaultType,
    today,
    typeOptions,
    paymentOptions,
    categoryOptions,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultType: CashTransactionType;
    today: string;
    typeOptions: SelectOption<CashTransactionType>[];
    paymentOptions: SelectOption<CashPaymentMethod>[];
    categoryOptions: CashCategoryOptions[];
}) {
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<CashTransactionFormData>(
            transactionFormDefaults(today, defaultType, categoryOptions),
        );

    const activeCategories = useMemo(
        () => categoriesForType(categoryOptions, data.type),
        [categoryOptions, data.type],
    );
    const dialogTitle = `Tambah ${typeLabels[data.type]}`;

    useEffect(() => {
        if (!open) {
            return;
        }

        setData(transactionFormDefaults(today, defaultType, categoryOptions));
        clearErrors();
    }, [categoryOptions, clearErrors, defaultType, open, setData, today]);

    function selectFormType(nextType: CashTransactionType): void {
        setData({
            ...data,
            type: nextType,
            category: firstCategory(categoryOptions, nextType),
        });
    }

    function submitTransaction(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        post(storeCashTransaction.url(), {
            preserveScroll: true,
            onSuccess: () => {
                reset('amount', 'description');
                onOpenChange(false);
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto p-0 sm:max-w-xl">
                <form onSubmit={submitTransaction}>
                    <DialogHeader className="border-b px-5 py-4 pr-12">
                        <DialogTitle>{dialogTitle}</DialogTitle>
                        <DialogDescription>
                            Catat transaksi manual di luar POS.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 px-5 py-4">
                        <div className="grid grid-cols-2 gap-2">
                            {typeOptions.map((option) => {
                                const Icon = typeIcons[option.value];
                                const isActive = data.type === option.value;

                                return (
                                    <Button
                                        key={option.value}
                                        type="button"
                                        variant={
                                            isActive ? 'default' : 'outline'
                                        }
                                        className="min-w-0 justify-start"
                                        onClick={() =>
                                            selectFormType(option.value)
                                        }
                                    >
                                        <Icon />
                                        <span className="truncate">
                                            {option.label}
                                        </span>
                                    </Button>
                                );
                            })}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="transaction_date">
                                    Tanggal
                                </Label>
                                <Input
                                    id="transaction_date"
                                    type="date"
                                    value={data.transaction_date}
                                    onChange={(event) =>
                                        setData(
                                            'transaction_date',
                                            event.target.value,
                                        )
                                    }
                                    required
                                    aria-invalid={Boolean(
                                        errors.transaction_date,
                                    )}
                                />
                                <InputError message={errors.transaction_date} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="amount">Nominal</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    min="1"
                                    step="1"
                                    inputMode="numeric"
                                    value={data.amount}
                                    onChange={(event) =>
                                        setData('amount', event.target.value)
                                    }
                                    placeholder="0"
                                    required
                                    aria-invalid={Boolean(errors.amount)}
                                />
                                <InputError message={errors.amount} />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="category">Kategori</Label>
                                <Select
                                    value={data.category}
                                    onValueChange={(value) =>
                                        setData('category', value)
                                    }
                                    required
                                >
                                    <SelectTrigger
                                        id="category"
                                        className="w-full"
                                        aria-invalid={Boolean(errors.category)}
                                    >
                                        <SelectValue placeholder="Pilih kategori" />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        {activeCategories.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.category} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="payment_method">Metode</Label>
                                <Select
                                    value={data.payment_method}
                                    onValueChange={(value) =>
                                        setData(
                                            'payment_method',
                                            value as CashPaymentMethod,
                                        )
                                    }
                                    required
                                >
                                    <SelectTrigger
                                        id="payment_method"
                                        className="w-full"
                                        aria-invalid={Boolean(
                                            errors.payment_method,
                                        )}
                                    >
                                        <SelectValue placeholder="Pilih metode" />
                                    </SelectTrigger>
                                    <SelectContent align="start">
                                        {paymentOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.payment_method} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Catatan</Label>
                            <textarea
                                id="description"
                                value={data.description}
                                onChange={(event) =>
                                    setData('description', event.target.value)
                                }
                                rows={3}
                                placeholder="Contoh: penjualan marketplace"
                                aria-invalid={Boolean(errors.description)}
                                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <InputError message={errors.description} />
                        </div>
                    </div>

                    <DialogFooter className="border-t bg-muted/30 px-5 py-4">
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                            >
                                Batal
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={processing}>
                            <Save />
                            {processing ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Metric({
    label,
    value,
    detail,
    icon: Icon,
    className,
    valueClassName,
}: {
    label: string;
    value: string;
    detail: string;
    icon: LucideIcon;
    className?: string;
    valueClassName?: string;
}) {
    return (
        <div
            className={cn(
                'min-w-0 rounded-lg border border-border/70 bg-card p-4 text-card-foreground shadow-xs',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <div
                        className={cn(
                            'mt-2 text-2xl leading-tight font-semibold break-words',
                            valueClassName,
                        )}
                    >
                        {value}
                    </div>
                </div>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
        </div>
    );
}

function CategoryBreakdownCard({
    items,
}: {
    items: CashCategoryBreakdownItem[];
}) {
    const maxTotal = Math.max(1, ...items.map((item) => item.total));

    return (
        <section className="overflow-hidden rounded-lg border border-border/70 bg-background">
            <div className="border-b px-4 py-3">
                <h2 className="font-semibold">Kategori Terbesar</h2>
                <p className="text-sm text-muted-foreground">
                    Berdasarkan filter aktif.
                </p>
            </div>

            {items.length > 0 ? (
                <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
                    {items.map((item) => {
                        const percentage = Math.max(
                            4,
                            Math.round((item.total / maxTotal) * 100),
                        );

                        return (
                            <div
                                key={`${item.type}-${item.category}`}
                                className="min-w-0 rounded-md border border-border/60 bg-card p-3"
                            >
                                <div className="flex items-start justify-between gap-3 text-sm">
                                    <div className="min-w-0">
                                        <div className="truncate font-medium">
                                            {item.category}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {typeLabels[item.type]} -{' '}
                                            {item.transactions} transaksi
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right font-semibold">
                                        {formatRupiah(item.total)}
                                    </div>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className={cn(
                                            'h-full rounded-full',
                                            item.type === 'income'
                                                ? 'bg-emerald-500'
                                                : 'bg-rose-500',
                                        )}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex min-h-40 flex-col items-center justify-center gap-2 px-4 py-10 text-center text-muted-foreground">
                    <WalletCards className="size-8" />
                    <span>Belum ada data kategori.</span>
                </div>
            )}
        </section>
    );
}

function TypeFilterButton({
    label,
    active,
    icon: Icon,
    onClick,
}: {
    label: string;
    active: boolean;
    icon?: LucideIcon;
    onClick: () => void;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            className={cn(
                'h-8 min-w-0 justify-start px-2 text-muted-foreground hover:bg-background/70 hover:text-foreground',
                active &&
                    'bg-background text-foreground shadow-xs hover:bg-background',
            )}
            onClick={onClick}
        >
            {Icon && <Icon />}
            <span className="truncate">{label}</span>
        </Button>
    );
}

function TransactionRow({
    transaction,
    paymentOptions,
}: {
    transaction: CashTransactionItem;
    paymentOptions: SelectOption<CashPaymentMethod>[];
}) {
    return (
        <tr className="transition-colors hover:bg-muted/30">
            <td className="px-4 py-4 whitespace-nowrap">
                {formatDate(transaction.transaction_date)}
            </td>
            <td className="px-4 py-4">
                <TransactionTypeBadge type={transaction.type} />
            </td>
            <td className="px-4 py-4">
                <span className="line-clamp-1 font-medium">
                    {transaction.category}
                </span>
            </td>
            <td className="px-4 py-4">
                <span className="line-clamp-1 text-muted-foreground">
                    {transaction.description || '-'}
                </span>
            </td>
            <td className="px-4 py-4">
                {optionLabel(paymentOptions, transaction.payment_method)}
            </td>
            <td className="px-4 py-4">
                <div className="line-clamp-1">{transaction.user.name}</div>
                <div className="text-xs text-muted-foreground">
                    {formatDateTime(transaction.created_at)}
                </div>
            </td>
            <td className="px-4 py-4 text-right font-semibold whitespace-nowrap">
                <TransactionAmount transaction={transaction} />
            </td>
            <td className="px-4 py-4">
                <DeleteTransactionDialog transaction={transaction} />
            </td>
        </tr>
    );
}

function TransactionCard({
    transaction,
    paymentOptions,
}: {
    transaction: CashTransactionItem;
    paymentOptions: SelectOption<CashPaymentMethod>[];
}) {
    return (
        <article className="grid gap-3 rounded-lg border border-border/70 bg-card p-3 text-card-foreground shadow-xs">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="truncate font-semibold">
                        {transaction.category}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.transaction_date)} -{' '}
                        {optionLabel(
                            paymentOptions,
                            transaction.payment_method,
                        )}
                    </p>
                </div>
                <TransactionTypeBadge type={transaction.type} />
            </div>

            <dl className="grid gap-2 text-sm">
                <Detail
                    label="Nominal"
                    value={<TransactionAmount transaction={transaction} />}
                />
                <Detail
                    label="Catatan"
                    value={transaction.description || '-'}
                />
                <Detail label="Dicatat" value={transaction.user.name} />
            </dl>

            <div className="flex justify-end">
                <DeleteTransactionDialog transaction={transaction} compact />
            </div>
        </article>
    );
}

function TransactionTypeBadge({ type }: { type: CashTransactionType }) {
    const Icon = typeIcons[type];

    return (
        <Badge variant={type === 'income' ? 'secondary' : 'outline'}>
            <Icon />
            {typeLabels[type]}
        </Badge>
    );
}

function TransactionAmount({
    transaction,
}: {
    transaction: CashTransactionItem;
}) {
    const isIncome = transaction.type === 'income';

    return (
        <span
            className={cn(
                'tabular-nums',
                isIncome
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400',
            )}
        >
            {isIncome ? '+' : '-'}
            {formatRupiah(transaction.amount)}
        </span>
    );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 text-right font-medium break-words">
                {value}
            </dd>
        </div>
    );
}

function DeleteTransactionDialog({
    transaction,
    compact = false,
}: {
    transaction: CashTransactionItem;
    compact?: boolean;
}) {
    function deleteTransaction(): void {
        router.delete(destroyCashTransaction(transaction.id), {
            preserveScroll: true,
        });
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    type="button"
                    variant={compact ? 'outline' : 'ghost'}
                    size={compact ? 'sm' : 'icon'}
                    className={cn(compact && 'w-full')}
                    title="Hapus transaksi"
                    aria-label={`Hapus transaksi ${transaction.category}`}
                >
                    <Trash2 />
                    {compact && <span>Hapus</span>}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus transaksi kas?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Transaksi {transaction.category} sebesar{' '}
                        {formatRupiah(transaction.amount)} akan dihapus
                        permanen.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
                        onClick={deleteTransaction}
                    >
                        Hapus
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function EmptyTransactions() {
    return (
        <div className="flex min-h-52 flex-col items-center justify-center gap-2 px-4 py-12 text-center text-muted-foreground">
            <NotebookText className="size-8" />
            <span>Tidak ada transaksi kas yang cocok.</span>
        </div>
    );
}

function visiblePaginationPages(
    currentPage: number,
    lastPage: number,
): number[] {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(lastPage, currentPage + 2);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function PaginationButton({
    page,
    active = false,
    disabled = false,
    filters,
    ariaLabel,
    children,
}: {
    page: number;
    active?: boolean;
    disabled?: boolean;
    filters: CashTransactionFilters;
    ariaLabel?: string;
    children: ReactNode;
}) {
    if (disabled) {
        return (
            <Button type="button" variant="outline" size="icon" disabled>
                {children}
            </Button>
        );
    }

    return (
        <Button
            asChild
            variant={active ? 'default' : 'outline'}
            size="icon"
            aria-current={active ? 'page' : undefined}
        >
            <Link
                href={cashTransactionsIndex({
                    query: queryParams({ ...filters, page }),
                })}
                preserveScroll
                aria-label={ariaLabel ?? `Halaman ${page}`}
            >
                {children}
            </Link>
        </Button>
    );
}
