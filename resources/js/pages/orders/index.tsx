import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Eye, Printer, Search } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/currency';
import { formatDateTime } from '@/lib/date';
import {
    index as ordersIndex,
    receipt as receiptOrder,
    show as showOrder,
} from '@/routes/orders';
import type { OrderListItem, PaginatedData } from '@/types';

type OrdersIndexProps = {
    orders: PaginatedData<OrderListItem>;
    filters: {
        date: string;
        status: string;
        search: string;
    };
};

const statusLabels: Record<string, string> = {
    open: 'Open',
    paid: 'Paid',
    void: 'Void',
};

function getVisiblePages(currentPage: number, lastPage: number): number[] {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(lastPage, currentPage + 2);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function OrdersIndex({ orders, filters }: OrdersIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);

    function applyFilters(event?: FormEvent<HTMLFormElement>): void {
        event?.preventDefault();

        router.get(
            ordersIndex(),
            {
                date: 'today',
                status: status || undefined,
                search: search || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    }

    function filterByStatus(nextStatus: string): void {
        setStatus(nextStatus);

        router.get(
            ordersIndex(),
            {
                date: 'today',
                status: nextStatus || undefined,
                search: search || undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    }

    const visiblePages = getVisiblePages(orders.current_page, orders.last_page);

    return (
        <>
            <Head title="Orders" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                    <div>
                        <h1 className="text-2xl font-semibold">Orders</h1>
                        <p className="text-sm text-muted-foreground">
                            Today by default, newest first
                        </p>
                    </div>

                    <form
                        onSubmit={applyFilters}
                        className="flex flex-col gap-2 sm:flex-row"
                    >
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Invoice, queue, customer"
                                className="w-full pl-9 sm:w-72"
                            />
                        </div>
                        <Button type="submit">Search</Button>
                    </form>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant={status === '' ? 'default' : 'outline'}
                        onClick={() => filterByStatus('')}
                    >
                        Today
                    </Button>
                    {Object.entries(statusLabels).map(([value, label]) => (
                        <Button
                            key={value}
                            type="button"
                            variant={status === value ? 'default' : 'outline'}
                            onClick={() => filterByStatus(value)}
                        >
                            {label}
                        </Button>
                    ))}
                </div>

                <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3">Queue</th>
                                    <th className="px-4 py-3">Invoice</th>
                                    <th className="hidden px-4 py-3 md:table-cell">
                                        Time
                                    </th>
                                    <th className="px-4 py-3">Customer</th>
                                    <th className="hidden px-4 py-3 lg:table-cell">
                                        Payment
                                    </th>
                                    <th className="px-4 py-3">Total</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="hidden px-4 py-3 xl:table-cell">
                                        Cashier
                                    </th>
                                    <th className="w-28 px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {orders.data.length > 0 ? (
                                    orders.data.map((order) => (
                                        <tr
                                            key={order.id}
                                            className="hover:bg-muted/30"
                                        >
                                            <td className="px-4 py-4 font-semibold">
                                                {order.queue_number}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-medium">
                                                    {order.invoice_number}
                                                </div>
                                                <div className="text-xs text-muted-foreground md:hidden">
                                                    {formatDateTime(
                                                        order.created_at,
                                                    )}
                                                </div>
                                            </td>
                                            <td className="hidden px-4 py-4 text-muted-foreground md:table-cell">
                                                {formatDateTime(
                                                    order.created_at,
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {order.customer_name || '-'}
                                            </td>
                                            <td className="hidden px-4 py-4 uppercase lg:table-cell">
                                                {order.payment_method || '-'}
                                            </td>
                                            <td className="px-4 py-4 font-medium whitespace-nowrap">
                                                {formatRupiah(
                                                    order.grand_total,
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <Badge
                                                    variant={
                                                        order.status === 'paid'
                                                            ? 'secondary'
                                                            : order.status ===
                                                                'void'
                                                              ? 'outline'
                                                              : 'default'
                                                    }
                                                >
                                                    {order.status}
                                                </Badge>
                                            </td>
                                            <td className="hidden px-4 py-4 xl:table-cell">
                                                {order.cashier.name}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-end gap-2">
                                                    {order.status ===
                                                        'paid' && (
                                                        <Button
                                                            asChild
                                                            variant="outline"
                                                            size="icon"
                                                            title="Print receipt"
                                                        >
                                                            <a
                                                                href={receiptOrder.url(
                                                                    order.id,
                                                                )}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <Printer />
                                                            </a>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="icon"
                                                        title="View order"
                                                    >
                                                        <Link
                                                            href={showOrder(
                                                                order.id,
                                                            )}
                                                        >
                                                            <Eye />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="px-4 py-16 text-center text-muted-foreground"
                                        >
                                            No orders found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {orders.total > 0 && (
                        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {orders.from} to {orders.to} of{' '}
                                {orders.total}
                            </p>

                            <div className="flex items-center gap-1">
                                <PaginationButton
                                    page={orders.current_page - 1}
                                    disabled={orders.current_page === 1}
                                    filters={{ search, status }}
                                    ariaLabel="Previous page"
                                >
                                    <ChevronLeft />
                                </PaginationButton>
                                {visiblePages.map((page) => (
                                    <PaginationButton
                                        key={page}
                                        page={page}
                                        active={page === orders.current_page}
                                        filters={{ search, status }}
                                    >
                                        {page}
                                    </PaginationButton>
                                ))}
                                <PaginationButton
                                    page={orders.current_page + 1}
                                    disabled={
                                        orders.current_page === orders.last_page
                                    }
                                    filters={{ search, status }}
                                    ariaLabel="Next page"
                                >
                                    <ChevronRight />
                                </PaginationButton>
                            </div>
                        </div>
                    )}
                </div>
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
    filters: { search: string; status: string };
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
                    query: {
                        page,
                        date: 'today',
                        status: filters.status || undefined,
                        search: filters.search || undefined,
                    },
                })}
                preserveScroll
                aria-label={ariaLabel ?? `Page ${page}`}
            >
                {children}
            </Link>
        </Button>
    );
}
