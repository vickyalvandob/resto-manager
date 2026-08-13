import { Head, Link, router } from '@inertiajs/react';
import {
    Banknote,
    CalendarDays,
    ChartNoAxesColumn,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    ReceiptText,
    WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRupiah } from '@/lib/currency';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { index as reportsIndex } from '@/routes/reports';
import type {
    OrderType,
    PaginatedData,
    PaymentBreakdown,
    PaymentMethod,
} from '@/types';

type ReportRange =
    'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

type ReportFilters = {
    range: ReportRange;
    from: string;
    to: string;
};

type ReportSummary = {
    total_revenue: number;
    total_paid_transactions: number;
    average_transaction: number;
};

type ReportTrendPoint = {
    period: string;
    label: string;
    transactions: number;
    revenue: number;
};

type ReportTrend = {
    label: string;
    granularity: 'daily' | 'monthly';
    total_transactions: number;
    total_revenue: number;
    points: ReportTrendPoint[];
};

type ReportOrder = {
    id: number;
    queue_number: string;
    invoice_number: string;
    customer_name: string | null;
    order_type: OrderType;
    date: string | null;
    cashier: {
        id: number;
        name: string;
    };
    payment_method: PaymentMethod;
    grand_total: number;
};

type ReportsProps = {
    filters: ReportFilters;
    summary: ReportSummary;
    paymentBreakdown: PaymentBreakdown;
    trend: ReportTrend;
    orders: PaginatedData<ReportOrder>;
};

const rangeOptions: Array<{ value: ReportRange; label: string }> = [
    { value: 'today', label: 'Hari ini' },
    { value: 'yesterday', label: 'Kemarin' },
    { value: 'this_week', label: 'Minggu ini' },
    { value: 'this_month', label: 'Bulan ini' },
    { value: 'custom', label: 'Custom' },
];

const paymentLabels: Record<PaymentMethod, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    transfer: 'Transfer',
};

const paymentIcons: Record<PaymentMethod, LucideIcon> = {
    cash: Banknote,
    qris: WalletCards,
    transfer: CreditCard,
};

const orderTypeLabels: Record<OrderType, string> = {
    dine_in: 'Dine In',
    take_away: 'Take Away',
};

function rangeLabel(range: ReportRange): string {
    return (
        rangeOptions.find((option) => option.value === range)?.label ??
        'Hari ini'
    );
}

function percentage(value: number, total: number): number {
    if (total <= 0) {
        return 0;
    }

    return Math.round((value / total) * 100);
}

function queryParams({
    range,
    from,
    to,
    page,
}: ReportFilters & { page?: number }): {
    range: ReportRange;
    from?: string;
    to?: string;
    page?: number;
} {
    return {
        range,
        from: range === 'custom' ? from : undefined,
        to: range === 'custom' ? to : undefined,
        page,
    };
}

export default function ReportsIndex({
    filters,
    summary,
    paymentBreakdown,
    trend,
    orders,
}: ReportsProps) {
    const [range, setRange] = useState<ReportRange>(filters.range);
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);

    const activeFilters: ReportFilters = { range, from, to };
    const periodLabel =
        range === 'custom'
            ? `${filters.from} sampai ${filters.to}`
            : rangeLabel(range);
    const visiblePages = useMemo(
        () => visiblePaginationPages(orders.current_page, orders.last_page),
        [orders.current_page, orders.last_page],
    );

    function visitReports(nextFilters: ReportFilters): void {
        router.get(reportsIndex(), queryParams(nextFilters), {
            preserveScroll: true,
            preserveState: true,
        });
    }

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        visitReports(activeFilters);
    }

    function selectRange(nextRange: ReportRange): void {
        setRange(nextRange);

        if (nextRange !== 'custom') {
            visitReports({ range: nextRange, from, to });
        }
    }

    return (
        <>
            <Head title="Reports" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold">Reports</h1>
                        <p className="text-sm text-muted-foreground">
                            Analisis transaksi paid berdasarkan waktu bayar.
                        </p>
                    </div>
                    <Badge
                        variant="outline"
                        className="w-fit gap-1.5 px-3 py-1.5"
                    >
                        <CalendarDays className="size-3.5" />
                        {periodLabel}
                    </Badge>
                </div>

                <section className="overflow-hidden rounded-lg border border-border/70 bg-background">
                    <form
                        onSubmit={submit}
                        className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-end"
                    >
                        <div className="grid gap-2">
                            <Label>Periode</Label>
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                {rangeOptions.map((option) => (
                                    <Button
                                        key={option.value}
                                        type="button"
                                        variant={
                                            range === option.value
                                                ? 'default'
                                                : 'outline'
                                        }
                                        className="h-9 min-w-max"
                                        onClick={() =>
                                            selectRange(option.value)
                                        }
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[150px_150px_auto] sm:items-end">
                            <div className="grid gap-2">
                                <Label htmlFor="from">Dari</Label>
                                <Input
                                    id="from"
                                    type="date"
                                    value={from}
                                    onChange={(event) =>
                                        setFrom(event.target.value)
                                    }
                                    disabled={range !== 'custom'}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="to">Sampai</Label>
                                <Input
                                    id="to"
                                    type="date"
                                    value={to}
                                    onChange={(event) =>
                                        setTo(event.target.value)
                                    }
                                    disabled={range !== 'custom'}
                                />
                            </div>
                            <Button type="submit" disabled={range !== 'custom'}>
                                Terapkan
                            </Button>
                        </div>
                    </form>
                </section>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Metric
                        label="Omzet Paid"
                        value={formatRupiah(summary.total_revenue)}
                        detail={periodLabel}
                        icon={ChartNoAxesColumn}
                        className="sm:col-span-2"
                    />
                    <Metric
                        label="Transaksi"
                        value={String(summary.total_paid_transactions)}
                        detail="Order paid"
                        icon={ReceiptText}
                    />
                    <Metric
                        label="Rata-rata"
                        value={formatRupiah(summary.average_transaction)}
                        detail="Per transaksi"
                        icon={WalletCards}
                    />
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <TrendCard trend={trend} />
                    <PaymentBreakdownCard
                        breakdown={paymentBreakdown}
                        totalRevenue={summary.total_revenue}
                    />
                </div>

                <section className="overflow-hidden rounded-lg border border-border/70 bg-background">
                    <div className="flex flex-col justify-between gap-2 border-b px-4 py-3 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="font-semibold">Transaksi Paid</h2>
                            <p className="text-sm text-muted-foreground">
                                {orders.total > 0
                                    ? `Menampilkan ${orders.from} sampai ${orders.to} dari ${orders.total} transaksi`
                                    : 'Tidak ada transaksi paid pada periode ini'}
                            </p>
                        </div>
                        <Badge variant="outline">{rangeLabel(range)}</Badge>
                    </div>

                    <div className="grid gap-3 p-3 lg:hidden">
                        {orders.data.length > 0 ? (
                            orders.data.map((order) => (
                                <TransactionCard key={order.id} order={order} />
                            ))
                        ) : (
                            <EmptyTransactions />
                        )}
                    </div>

                    <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3">Invoice</th>
                                    <th className="px-4 py-3">Tanggal</th>
                                    <th className="px-4 py-3">Pelanggan</th>
                                    <th className="hidden px-4 py-3 xl:table-cell">
                                        Tipe
                                    </th>
                                    <th className="px-4 py-3">Kasir</th>
                                    <th className="px-4 py-3">Payment</th>
                                    <th className="px-4 py-3 text-right">
                                        Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {orders.data.length > 0 ? (
                                    orders.data.map((order) => (
                                        <TransactionRow
                                            key={order.id}
                                            order={order}
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7}>
                                            <EmptyTransactions />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {orders.total > 0 && (
                        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Halaman {orders.current_page} dari{' '}
                                {orders.last_page}
                            </p>
                            <div className="flex items-center gap-1 overflow-x-auto">
                                <PaginationButton
                                    page={orders.current_page - 1}
                                    disabled={orders.current_page === 1}
                                    filters={activeFilters}
                                    ariaLabel="Halaman sebelumnya"
                                >
                                    <ChevronLeft />
                                </PaginationButton>
                                {visiblePages.map((page) => (
                                    <PaginationButton
                                        key={page}
                                        page={page}
                                        active={page === orders.current_page}
                                        filters={activeFilters}
                                    >
                                        {page}
                                    </PaginationButton>
                                ))}
                                <PaginationButton
                                    page={orders.current_page + 1}
                                    disabled={
                                        orders.current_page === orders.last_page
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
            </div>
        </>
    );
}

ReportsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Reports',
            href: reportsIndex(),
        },
    ],
};

function Metric({
    label,
    value,
    detail,
    icon: Icon,
    className,
}: {
    label: string;
    value: string;
    detail: string;
    icon: LucideIcon;
    className?: string;
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
                    <div className="mt-2 text-2xl leading-tight font-semibold break-words">
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

function TrendCard({ trend }: { trend: ReportTrend }) {
    const maxRevenue = Math.max(
        1,
        ...trend.points.map((point) => point.revenue),
    );
    const gridTemplateColumns = `repeat(${Math.max(trend.points.length, 1)}, minmax(1.75rem, 1fr))`;

    return (
        <section className="min-w-0 rounded-lg border border-border/70 bg-card p-4 text-card-foreground shadow-xs">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                    <h2 className="font-semibold">{trend.label}</h2>
                    <p className="text-sm text-muted-foreground">
                        {trend.granularity === 'daily'
                            ? 'Ringkasan harian'
                            : 'Ringkasan bulanan'}
                    </p>
                </div>
                <Badge variant="outline">
                    {trend.total_transactions} transaksi
                </Badge>
            </div>

            <div className="mt-4 overflow-x-auto">
                <div
                    role="img"
                    aria-label={`${trend.label} chart`}
                    className="grid h-64 min-w-[36rem] grid-rows-[1fr_2rem] gap-2 rounded-md border border-border/70 bg-background p-3"
                >
                    <div
                        className="grid items-end gap-1"
                        style={{ gridTemplateColumns }}
                    >
                        {trend.points.map((point) => {
                            const height =
                                point.revenue === 0
                                    ? 0
                                    : Math.max(
                                          8,
                                          (point.revenue / maxRevenue) * 100,
                                      );

                            return (
                                <div
                                    key={point.period}
                                    className="group flex h-full min-w-0 items-end"
                                    title={`${point.label}: ${point.transactions} transaksi, ${formatRupiah(point.revenue)}`}
                                >
                                    <div
                                        className="mx-auto w-full max-w-8 rounded-t-sm bg-foreground/60 transition-colors group-hover:bg-foreground"
                                        style={{ height: `${height}%` }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <div className="grid gap-1" style={{ gridTemplateColumns }}>
                        {trend.points.map((point) => (
                            <span
                                key={point.period}
                                className="min-w-0 truncate text-center text-[10px] text-muted-foreground"
                            >
                                {point.label}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

function PaymentBreakdownCard({
    breakdown,
    totalRevenue,
}: {
    breakdown: PaymentBreakdown;
    totalRevenue: number;
}) {
    return (
        <section className="rounded-lg border border-border/70 bg-card p-4 text-card-foreground shadow-xs">
            <div>
                <h2 className="font-semibold">Metode Pembayaran</h2>
                <p className="text-sm text-muted-foreground">
                    Distribusi omzet paid
                </p>
            </div>

            <div className="mt-4 grid gap-3">
                {(Object.keys(paymentLabels) as PaymentMethod[]).map(
                    (method) => {
                        const Icon = paymentIcons[method];
                        const item = breakdown[method];
                        const share = percentage(item.total, totalRevenue);

                        return (
                            <div
                                key={method}
                                className="grid gap-2 rounded-md border border-border/70 bg-background px-3 py-2"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                            <Icon className="size-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="truncate font-medium">
                                                {paymentLabels[method]}
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                {item.count} transaksi
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">
                                            {formatRupiah(item.total)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {share}%
                                        </div>
                                    </div>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-foreground/70"
                                        style={{ width: `${share}%` }}
                                    />
                                </div>
                            </div>
                        );
                    },
                )}
            </div>
        </section>
    );
}

function TransactionRow({ order }: { order: ReportOrder }) {
    return (
        <tr className="transition-colors hover:bg-muted/30">
            <td className="px-4 py-4">
                <div className="font-medium">{order.invoice_number}</div>
                <div className="text-xs text-muted-foreground">
                    Antrean {order.queue_number}
                </div>
            </td>
            <td className="px-4 py-4 text-muted-foreground">
                {formatDateTime(order.date)}
            </td>
            <td className="px-4 py-4">
                <span className="line-clamp-1">
                    {order.customer_name || '-'}
                </span>
            </td>
            <td className="hidden px-4 py-4 xl:table-cell">
                {orderTypeLabels[order.order_type]}
            </td>
            <td className="px-4 py-4">
                <span className="line-clamp-1">{order.cashier.name}</span>
            </td>
            <td className="px-4 py-4">
                <Badge variant="outline">
                    {paymentLabels[order.payment_method]}
                </Badge>
            </td>
            <td className="px-4 py-4 text-right font-semibold whitespace-nowrap">
                {formatRupiah(order.grand_total)}
            </td>
        </tr>
    );
}

function TransactionCard({ order }: { order: ReportOrder }) {
    return (
        <article className="grid gap-3 rounded-lg border border-border/70 bg-card p-3 text-card-foreground shadow-xs">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="truncate font-semibold">
                        {order.invoice_number}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Antrean {order.queue_number} -{' '}
                        {formatDateTime(order.date)}
                    </p>
                </div>
                <Badge variant="outline">
                    {paymentLabels[order.payment_method]}
                </Badge>
            </div>

            <dl className="grid gap-2 text-sm">
                <Detail label="Pelanggan" value={order.customer_name || '-'} />
                <Detail
                    label="Tipe"
                    value={orderTypeLabels[order.order_type]}
                />
                <Detail label="Kasir" value={order.cashier.name} />
                <Detail
                    label="Total"
                    value={formatRupiah(order.grand_total)}
                    strong
                />
            </dl>
        </article>
    );
}

function Detail({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd
                className={cn(
                    'min-w-0 text-right break-words',
                    strong ? 'font-semibold' : 'font-medium',
                )}
            >
                {value}
            </dd>
        </div>
    );
}

function EmptyTransactions() {
    return (
        <div className="flex min-h-52 flex-col items-center justify-center gap-2 px-4 py-12 text-center text-muted-foreground">
            <ReceiptText className="size-8" />
            <span>Tidak ada transaksi paid yang cocok.</span>
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
    filters: ReportFilters;
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
                href={reportsIndex({
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
