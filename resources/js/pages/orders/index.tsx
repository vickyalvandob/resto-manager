import { Head, Link, router } from '@inertiajs/react';
import {
    Ban,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Eye,
    Printer,
    ReceiptText,
    Search,
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
import {
    index as ordersIndex,
    receipt as receiptOrder,
    show as showOrder,
} from '@/routes/orders';
import type {
    OrderListItem,
    OrderStatus,
    OrderType,
    PaginatedData,
    PaymentMethod,
} from '@/types';

type OrderDateFilter = 'today' | 'yesterday' | 'all';
type OrderStatusFilter = '' | OrderStatus;

type OrderFilters = {
    date: OrderDateFilter;
    status: OrderStatusFilter;
    search: string;
};

type OrderSummary = {
    total_orders: number;
    open_orders: number;
    paid_orders: number;
    void_orders: number;
    paid_revenue: number;
};

type OrdersIndexProps = {
    orders: PaginatedData<OrderListItem>;
    filters: OrderFilters;
    summary: OrderSummary;
    isSimpleCashierView: boolean;
};

const dateFilterOptions: Array<{ value: OrderDateFilter; label: string }> = [
    { value: 'today', label: 'Hari ini' },
    { value: 'yesterday', label: 'Kemarin' },
    { value: 'all', label: 'Semua tanggal' },
];

const statusLabels: Record<OrderStatus, string> = {
    open: 'Open',
    paid: 'Paid',
    void: 'Void',
};

const statusIcons: Record<OrderStatus, LucideIcon> = {
    open: Clock3,
    paid: CheckCircle2,
    void: Ban,
};

const orderTypeLabels: Record<OrderType, string> = {
    dine_in: 'Dine In',
    take_away: 'Take Away',
};

const paymentLabels: Record<PaymentMethod, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    transfer: 'Transfer',
};

function getVisiblePages(currentPage: number, lastPage: number): number[] {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(lastPage, currentPage + 2);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function dateFilterLabel(date: OrderDateFilter): string {
    return (
        dateFilterOptions.find((option) => option.value === date)?.label ??
        'Hari ini'
    );
}

function paymentMethodLabel(paymentMethod: PaymentMethod | null): string {
    return paymentMethod ? paymentLabels[paymentMethod] : '-';
}

function statusBadgeVariant(
    status: OrderStatus,
): 'default' | 'secondary' | 'outline' {
    if (status === 'paid') {
        return 'secondary';
    }

    if (status === 'void') {
        return 'outline';
    }

    return 'default';
}

function queryParams({
    date,
    status,
    search,
    page,
}: OrderFilters & { page?: number }): {
    date: OrderDateFilter;
    status?: OrderStatus;
    search?: string;
    page?: number;
} {
    return {
        date,
        status: status || undefined,
        search: search.trim() || undefined,
        page,
    };
}

export default function OrdersIndex({
    orders,
    filters,
    summary,
    isSimpleCashierView,
}: OrdersIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState<OrderStatusFilter>(filters.status);
    const [date, setDate] = useState<OrderDateFilter>(filters.date);

    const visiblePages = useMemo(
        () => getVisiblePages(orders.current_page, orders.last_page),
        [orders.current_page, orders.last_page],
    );
    const hasActiveFilters =
        search.trim() !== '' || status !== '' || date !== 'today';
    const activeFilters: OrderFilters = { date, status, search };

    function visitOrders(nextFilters: OrderFilters): void {
        router.get(ordersIndex(), queryParams(nextFilters), {
            preserveState: true,
            preserveScroll: true,
        });
    }

    function applyFilters(event?: FormEvent<HTMLFormElement>): void {
        event?.preventDefault();

        visitOrders({
            date,
            status,
            search: search.trim(),
        });
    }

    function filterByDate(nextDate: OrderDateFilter): void {
        setDate(nextDate);
        visitOrders({ date: nextDate, status, search: search.trim() });
    }

    function filterByStatus(nextStatus: OrderStatusFilter): void {
        setStatus(nextStatus);
        visitOrders({ date, status: nextStatus, search: search.trim() });
    }

    function resetFilters(): void {
        const nextFilters: OrderFilters = {
            date: 'today',
            status: '',
            search: '',
        };

        setDate(nextFilters.date);
        setStatus(nextFilters.status);
        setSearch(nextFilters.search);
        visitOrders(nextFilters);
    }

    return (
        <>
            <Head title="Orders" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-semibold">Orders</h1>
                        <p className="text-sm text-muted-foreground">
                            {isSimpleCashierView
                                ? 'Order hari ini dengan filter status cepat.'
                                : 'Pantau status order, kasir, dan pembayaran.'}
                        </p>
                    </div>
                    <Badge
                        variant="outline"
                        className="w-fit gap-1.5 px-3 py-1.5"
                    >
                        <CalendarDays className="size-3.5" />
                        {dateFilterLabel(date)}
                    </Badge>
                </div>

                {!isSimpleCashierView && (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Metric
                            label="Total Order"
                            value={String(summary.total_orders)}
                            detail={dateFilterLabel(date)}
                            icon={ReceiptText}
                        />
                        <Metric
                            label="Open"
                            value={String(summary.open_orders)}
                            detail="Belum dibayar"
                            icon={Clock3}
                        />
                        <Metric
                            label="Omzet Paid"
                            value={formatRupiah(summary.paid_revenue)}
                            detail={`${summary.paid_orders} transaksi lunas`}
                            icon={WalletCards}
                            className="sm:col-span-2 xl:col-span-1"
                        />
                        <Metric
                            label="Void"
                            value={String(summary.void_orders)}
                            detail="Order dibatalkan"
                            icon={Ban}
                        />
                    </div>
                )}

                <section className="overflow-hidden rounded-lg border border-border/70 bg-background">
                    {!isSimpleCashierView && (
                        <div className="grid gap-3 border-b px-4 py-3 lg:grid-cols-[1fr_auto] lg:items-end">
                            <form
                                onSubmit={applyFilters}
                                className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto_auto] sm:items-end"
                            >
                                <div className="grid gap-2">
                                    <Label htmlFor="orders_search">Cari</Label>
                                    <div className="relative">
                                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="orders_search"
                                            value={search}
                                            onChange={(event) =>
                                                setSearch(event.target.value)
                                            }
                                            placeholder="Invoice, antrean, pelanggan"
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="orders_date">Tanggal</Label>
                                    <select
                                        id="orders_date"
                                        value={date}
                                        onChange={(event) =>
                                            filterByDate(
                                                event.target
                                                    .value as OrderDateFilter,
                                            )
                                        }
                                        className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    >
                                        {dateFilterOptions.map((option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <Button type="submit">
                                    <Search />
                                    Terapkan
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!hasActiveFilters}
                                    onClick={resetFilters}
                                >
                                    Reset
                                </Button>
                            </form>
                        </div>
                    )}

                    <div className="flex gap-2 overflow-x-auto px-4 py-3">
                        <StatusFilterButton
                            label="Semua"
                            count={summary.total_orders}
                            active={status === ''}
                            onClick={() => filterByStatus('')}
                        />
                        <StatusFilterButton
                            label={statusLabels.open}
                            count={summary.open_orders}
                            active={status === 'open'}
                            icon={Clock3}
                            onClick={() => filterByStatus('open')}
                        />
                        <StatusFilterButton
                            label={statusLabels.paid}
                            count={summary.paid_orders}
                            active={status === 'paid'}
                            icon={CheckCircle2}
                            onClick={() => filterByStatus('paid')}
                        />
                        <StatusFilterButton
                            label={statusLabels.void}
                            count={summary.void_orders}
                            active={status === 'void'}
                            icon={Ban}
                            onClick={() => filterByStatus('void')}
                        />
                    </div>
                </section>

                <section className="overflow-hidden rounded-lg border border-border/70 bg-background">
                    <div className="flex flex-col justify-between gap-2 border-b px-4 py-3 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="font-semibold">Daftar Order</h2>
                            <p className="text-sm text-muted-foreground">
                                {orders.total > 0
                                    ? `Menampilkan ${orders.from} sampai ${orders.to} dari ${orders.total} order`
                                    : 'Tidak ada order untuk filter ini'}
                            </p>
                        </div>
                        {status !== '' && (
                            <Badge variant={statusBadgeVariant(status)}>
                                {statusLabels[status]}
                            </Badge>
                        )}
                    </div>

                    <div className="grid gap-3 p-3 lg:hidden">
                        {orders.data.length > 0 ? (
                            orders.data.map((order) => (
                                <OrderCard key={order.id} order={order} />
                            ))
                        ) : (
                            <EmptyOrders />
                        )}
                    </div>

                    <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3">Antrean</th>
                                    <th className="px-4 py-3">Order</th>
                                    <th className="px-4 py-3">Pelanggan</th>
                                    <th className="hidden px-4 py-3 xl:table-cell">
                                        Tipe
                                    </th>
                                    <th className="px-4 py-3">Pembayaran</th>
                                    <th className="px-4 py-3">Total</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="hidden px-4 py-3 xl:table-cell">
                                        Kasir
                                    </th>
                                    <th className="w-32 px-4 py-3 text-right">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {orders.data.length > 0 ? (
                                    orders.data.map((order) => (
                                        <OrderRow
                                            key={order.id}
                                            order={order}
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={9}>
                                            <EmptyOrders />
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

OrdersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Orders',
            href: ordersIndex(),
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

function StatusFilterButton({
    label,
    count,
    active,
    icon: Icon,
    onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    icon?: LucideIcon;
    onClick: () => void;
}) {
    return (
        <Button
            type="button"
            variant={active ? 'default' : 'outline'}
            className="min-w-max justify-start gap-2"
            onClick={onClick}
        >
            {Icon && <Icon />}
            <span>{label}</span>
            <span
                className={cn(
                    'rounded-md px-1.5 py-0.5 text-xs tabular-nums',
                    active
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground',
                )}
            >
                {count}
            </span>
        </Button>
    );
}

function OrderRow({ order }: { order: OrderListItem }) {
    const StatusIcon = statusIcons[order.status];

    return (
        <tr className="transition-colors hover:bg-muted/30">
            <td className="px-4 py-4">
                <div className="flex size-10 items-center justify-center rounded-md bg-muted font-semibold tabular-nums">
                    {order.queue_number}
                </div>
            </td>
            <td className="px-4 py-4">
                <div className="font-medium">{order.invoice_number}</div>
                <div className="text-xs text-muted-foreground">
                    {formatDateTime(order.created_at)}
                </div>
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
                {paymentMethodLabel(order.payment_method)}
            </td>
            <td className="px-4 py-4 font-semibold whitespace-nowrap">
                {formatRupiah(order.grand_total)}
            </td>
            <td className="px-4 py-4">
                <Badge variant={statusBadgeVariant(order.status)}>
                    <StatusIcon />
                    {statusLabels[order.status]}
                </Badge>
            </td>
            <td className="hidden px-4 py-4 xl:table-cell">
                <span className="line-clamp-1">{order.cashier.name}</span>
            </td>
            <td className="px-4 py-4">
                <OrderActions order={order} />
            </td>
        </tr>
    );
}

function OrderCard({ order }: { order: OrderListItem }) {
    const StatusIcon = statusIcons[order.status];

    return (
        <article className="grid gap-3 rounded-lg border border-border/70 bg-card p-3 text-card-foreground shadow-xs">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted font-semibold tabular-nums">
                            {order.queue_number}
                        </div>
                        <div className="min-w-0">
                            <h3 className="truncate font-semibold">
                                {order.invoice_number}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {formatDateTime(order.created_at)}
                            </p>
                        </div>
                    </div>
                </div>
                <Badge variant={statusBadgeVariant(order.status)}>
                    <StatusIcon />
                    {statusLabels[order.status]}
                </Badge>
            </div>

            <dl className="grid gap-2 text-sm">
                <Detail label="Pelanggan" value={order.customer_name || '-'} />
                <Detail
                    label="Tipe"
                    value={orderTypeLabels[order.order_type]}
                />
                <Detail
                    label="Pembayaran"
                    value={paymentMethodLabel(order.payment_method)}
                />
                <Detail label="Kasir" value={order.cashier.name} />
                <Detail
                    label="Total"
                    value={formatRupiah(order.grand_total)}
                    strong
                />
            </dl>

            <OrderActions order={order} compact />
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

function OrderActions({
    order,
    compact = false,
}: {
    order: OrderListItem;
    compact?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex gap-2',
                compact ? 'justify-stretch' : 'justify-end',
            )}
        >
            {order.status === 'paid' && (
                <Button
                    asChild
                    variant="outline"
                    size={compact ? 'sm' : 'icon'}
                    className={cn(compact && 'flex-1')}
                    title="Cetak struk"
                >
                    <a
                        href={receiptOrder.url(order.id)}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Printer />
                        {compact && <span>Cetak</span>}
                    </a>
                </Button>
            )}
            <Button
                asChild
                variant={compact ? 'default' : 'outline'}
                size={compact ? 'sm' : 'icon'}
                className={cn(compact && 'flex-1')}
                title="Lihat order"
            >
                <Link href={showOrder(order.id)} prefetch>
                    <Eye />
                    {compact && <span>Detail</span>}
                </Link>
            </Button>
        </div>
    );
}

function EmptyOrders() {
    return (
        <div className="flex min-h-52 flex-col items-center justify-center gap-2 px-4 py-12 text-center text-muted-foreground">
            <ReceiptText className="size-8" />
            <span>Tidak ada order yang cocok.</span>
        </div>
    );
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
    filters: OrderFilters;
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
                href={ordersIndex({
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
