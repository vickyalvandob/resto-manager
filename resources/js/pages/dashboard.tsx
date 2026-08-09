import { Head } from '@inertiajs/react';
import { CreditCard, ReceiptText, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/currency';
import { dashboard } from '@/routes';
import type { DashboardStats, PaymentBreakdown, PaymentMethod } from '@/types';

type DashboardProps = {
    stats: DashboardStats;
    paymentBreakdown: PaymentBreakdown;
};

const paymentLabels: Record<PaymentMethod, string> = {
    cash: 'Cash',
    qris: 'QRIS',
    transfer: 'Transfer',
};

const paymentIcons = {
    cash: Wallet,
    qris: ReceiptText,
    transfer: CreditCard,
};

export default function Dashboard({ stats, paymentBreakdown }: DashboardProps) {
    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">
                        Today summary
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-5">
                    <Metric
                        label="Omzet"
                        value={formatRupiah(stats.revenue)}
                        className="md:col-span-2"
                    />
                    <Metric
                        label="Paid Transactions"
                        value={String(stats.paid_transactions)}
                    />
                    <Metric label="Open" value={String(stats.open_orders)} />
                    <Metric label="Void" value={String(stats.void_orders)} />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    {(Object.keys(paymentLabels) as PaymentMethod[]).map(
                        (method) => {
                            const Icon = paymentIcons[method];
                            const breakdown = paymentBreakdown[method];

                            return (
                                <div
                                    key={method}
                                    className="rounded-lg border bg-background p-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                                                <Icon className="size-4" />
                                            </div>
                                            <div>
                                                <h2 className="font-semibold">
                                                    {paymentLabels[method]}
                                                </h2>
                                                <p className="text-sm text-muted-foreground">
                                                    {breakdown.count}{' '}
                                                    transactions
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="secondary">
                                            {formatRupiah(breakdown.total)}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        },
                    )}
                </div>

                <div className="rounded-lg border bg-background p-4">
                    <h2 className="font-semibold">Order Status</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <Status label="Open" value={stats.open_orders} />
                        <Status label="Paid" value={stats.paid_orders} />
                        <Status label="Void" value={stats.void_orders} />
                    </div>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};

function Metric({
    label,
    value,
    className,
}: {
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <div
            className={`rounded-lg border bg-background p-4 ${className ?? ''}`}
        >
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="mt-2 text-2xl font-semibold">{value}</div>
        </div>
    );
}

function Status({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}
