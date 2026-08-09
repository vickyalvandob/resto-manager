import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRupiah } from '@/lib/currency';
import { formatDateTime } from '@/lib/date';
import { index as reportsIndex } from '@/routes/reports';
import type { PaginatedData, PaymentBreakdown, PaymentMethod } from '@/types';

type ReportOrder = {
    id: number;
    invoice_number: string;
    date: string | null;
    cashier: {
        name: string;
    };
    payment_method: PaymentMethod;
    grand_total: number;
};

type ReportsProps = {
    filters: {
        range: string;
        from: string;
        to: string;
    };
    summary: {
        total_revenue: number;
        total_paid_transactions: number;
        average_transaction: number;
    };
    paymentBreakdown: PaymentBreakdown;
    orders: PaginatedData<ReportOrder>;
};

const rangeLabels: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    this_week: 'This Week',
    this_month: 'This Month',
    custom: 'Custom Range',
};

const paymentLabels: Record<PaymentMethod, string> = {
    cash: 'Cash',
    qris: 'QRIS',
    transfer: 'Transfer',
};

export default function ReportsIndex({
    filters,
    summary,
    paymentBreakdown,
    orders,
}: ReportsProps) {
    const [range, setRange] = useState(filters.range);
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        router.get(
            reportsIndex(),
            { range, from, to },
            { preserveScroll: true, preserveState: true },
        );
    }

    return (
        <>
            <Head title="Reports" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                    <div>
                        <h1 className="text-2xl font-semibold">Reports</h1>
                        <p className="text-sm text-muted-foreground">
                            Revenue counts paid orders only
                        </p>
                    </div>

                    <form
                        onSubmit={submit}
                        className="grid gap-3 sm:grid-cols-[180px_150px_150px_auto] sm:items-end"
                    >
                        <div className="grid gap-2">
                            <Label htmlFor="range">Range</Label>
                            <select
                                id="range"
                                value={range}
                                onChange={(event) =>
                                    setRange(event.target.value)
                                }
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                {Object.entries(rangeLabels).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    ),
                                )}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="from">From</Label>
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
                            <Label htmlFor="to">To</Label>
                            <Input
                                id="to"
                                type="date"
                                value={to}
                                onChange={(event) => setTo(event.target.value)}
                                disabled={range !== 'custom'}
                            />
                        </div>
                        <Button type="submit">Apply</Button>
                    </form>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Metric
                        label="Total Revenue"
                        value={formatRupiah(summary.total_revenue)}
                    />
                    <Metric
                        label="Paid Transactions"
                        value={String(summary.total_paid_transactions)}
                    />
                    <Metric
                        label="Average Transaction"
                        value={formatRupiah(summary.average_transaction)}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {(Object.keys(paymentLabels) as PaymentMethod[]).map(
                        (method) => (
                            <div
                                key={method}
                                className="rounded-lg border bg-background p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="font-semibold">
                                            {paymentLabels[method]}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            {paymentBreakdown[method].count}{' '}
                                            transactions
                                        </p>
                                    </div>
                                    <Badge variant="secondary">
                                        {formatRupiah(
                                            paymentBreakdown[method].total,
                                        )}
                                    </Badge>
                                </div>
                            </div>
                        ),
                    )}
                </div>

                <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3">Invoice</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Cashier</th>
                                    <th className="px-4 py-3">Payment</th>
                                    <th className="px-4 py-3">Grand Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {orders.data.length > 0 ? (
                                    orders.data.map((order) => (
                                        <tr key={order.id}>
                                            <td className="px-4 py-4 font-medium">
                                                {order.invoice_number}
                                            </td>
                                            <td className="px-4 py-4 text-muted-foreground">
                                                {formatDateTime(order.date)}
                                            </td>
                                            <td className="px-4 py-4">
                                                {order.cashier.name}
                                            </td>
                                            <td className="px-4 py-4 uppercase">
                                                {order.payment_method}
                                            </td>
                                            <td className="px-4 py-4 font-semibold">
                                                {formatRupiah(
                                                    order.grand_total,
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-16 text-center text-muted-foreground"
                                        >
                                            No paid transactions found.
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
                            <div className="flex gap-1">
                                <PaginationButton
                                    page={orders.current_page - 1}
                                    disabled={orders.current_page === 1}
                                    filters={{ range, from, to }}
                                >
                                    <ChevronLeft />
                                </PaginationButton>
                                <PaginationButton
                                    page={orders.current_page + 1}
                                    disabled={
                                        orders.current_page === orders.last_page
                                    }
                                    filters={{ range, from, to }}
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

ReportsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Reports',
            href: reportsIndex(),
        },
    ],
};

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border bg-background p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
        </div>
    );
}

function PaginationButton({
    page,
    disabled,
    filters,
    children,
}: {
    page: number;
    disabled: boolean;
    filters: { range: string; from: string; to: string };
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
        <Button asChild variant="outline" size="icon">
            <Link
                href={reportsIndex({
                    query: {
                        page,
                        range: filters.range,
                        from: filters.from,
                        to: filters.to,
                    },
                })}
                preserveScroll
            >
                {children}
            </Link>
        </Button>
    );
}
