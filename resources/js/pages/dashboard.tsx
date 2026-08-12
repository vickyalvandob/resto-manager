import { Head } from '@inertiajs/react';
import { CreditCard, ReceiptText, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatRupiah } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type {
    DashboardStats,
    PaymentBreakdown,
    PaymentMethod,
    TransactionChart,
    TransactionChartRange,
    TransactionChartSeries,
} from '@/types';

type DashboardProps = {
    stats: DashboardStats;
    paymentBreakdown: PaymentBreakdown;
    transactionChart: TransactionChart;
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

const chartRanges: TransactionChartRange[] = [
    'last_3_months',
    'last_30_days',
    'last_7_days',
];

const chartRangeLabels: Record<TransactionChartRange, string> = {
    last_3_months: 'Last 3 months',
    last_30_days: 'Last 30 days',
    last_7_days: 'Last 7 days',
};

export default function Dashboard({
    stats,
    paymentBreakdown,
    transactionChart,
}: DashboardProps) {
    const [activeChartRange, setActiveChartRange] =
        useState<TransactionChartRange>('last_7_days');

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">
                        Ringkasan operasional hari ini
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

                <TransactionChartCard
                    chart={transactionChart[activeChartRange]}
                    activeRange={activeChartRange}
                    onRangeChange={setActiveChartRange}
                />

                <div className="grid gap-4 lg:grid-cols-3">
                    {(Object.keys(paymentLabels) as PaymentMethod[]).map(
                        (method) => {
                            const Icon = paymentIcons[method];
                            const breakdown = paymentBreakdown[method];

                            return (
                                <div
                                    key={method}
                                    className="rounded-lg border border-border/70 bg-card p-4 text-card-foreground shadow-xs transition-colors hover:bg-muted/20"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                                <Icon className="size-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <h2 className="truncate font-semibold">
                                                    {paymentLabels[method]}
                                                </h2>
                                                <p className="text-sm text-muted-foreground">
                                                    {breakdown.count}{' '}
                                                    transactions
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="max-w-[45%] justify-end border-border/70 bg-muted/20 text-right text-foreground"
                                        >
                                            <span className="truncate">
                                                {formatRupiah(breakdown.total)}
                                            </span>
                                        </Badge>
                                    </div>
                                </div>
                            );
                        },
                    )}
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

function TransactionChartCard({
    chart,
    activeRange,
    onRangeChange,
}: {
    chart: TransactionChartSeries;
    activeRange: TransactionChartRange;
    onRangeChange: (range: TransactionChartRange) => void;
}) {
    const maxTransactions = useMemo(
        () => Math.max(1, ...chart.points.map((point) => point.transactions)),
        [chart.points],
    );

    const gridLabels = useMemo(() => {
        const middle = Math.ceil(maxTransactions / 2);

        return [maxTransactions, middle, 0].filter(
            (label, index, labels) => labels.indexOf(label) === index,
        );
    }, [maxTransactions]);

    return (
        <div className="rounded-lg border border-border/70 bg-card p-4 text-card-foreground shadow-xs">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div>
                    <h2 className="font-semibold">Transaction Trend</h2>
                    <p className="text-sm text-muted-foreground">
                        Paid transaction count by period
                    </p>
                </div>

                <ToggleGroup
                    type="single"
                    value={activeRange}
                    onValueChange={(value) => {
                        if (value) {
                            onRangeChange(value as TransactionChartRange);
                        }
                    }}
                    className="w-full justify-start overflow-x-auto rounded-md border border-border/70 bg-muted/30 p-1 sm:w-auto"
                >
                    {chartRanges.map((range) => (
                        <ToggleGroupItem
                            key={range}
                            value={range}
                            size="sm"
                            className="min-w-max rounded-sm px-3 text-muted-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-xs"
                        >
                            {chartRangeLabels[range]}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_180px]">
                <div
                    role="img"
                    aria-label={`${chart.label} paid transaction chart`}
                    className="relative h-64 overflow-hidden rounded-md border border-border/70 bg-muted/10 p-3"
                >
                    <div className="absolute inset-x-3 top-3 bottom-11 flex flex-col justify-between">
                        {gridLabels.map((label) => (
                            <div
                                key={label}
                                className="flex items-center gap-2"
                            >
                                <span className="w-6 text-right text-[10px] text-muted-foreground">
                                    {label}
                                </span>
                                <span className="h-px flex-1 bg-border/70" />
                            </div>
                        ))}
                    </div>

                    <div className="relative z-10 grid h-full grid-rows-[1fr_2rem] gap-2 pl-8">
                        <div className="flex items-end gap-1">
                            {chart.points.map((point) => {
                                const barHeight =
                                    point.transactions === 0
                                        ? 0
                                        : Math.max(
                                              8,
                                              (point.transactions /
                                                  maxTransactions) *
                                                  100,
                                          );

                                return (
                                    <Tooltip key={point.period}>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                className="group flex h-full min-w-0 flex-1 cursor-default items-end rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                                                aria-label={`${point.label}: ${point.transactions} transactions, ${formatRupiah(point.revenue)}`}
                                            >
                                                <span
                                                    className="mx-auto block w-full max-w-8 rounded-t-sm bg-foreground/60 transition-colors group-hover:bg-foreground group-focus-visible:bg-foreground"
                                                    style={{
                                                        height: `${barHeight}%`,
                                                    }}
                                                />
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent
                                            side="top"
                                            className="w-56 px-3 py-2"
                                        >
                                            <div className="font-medium">
                                                {point.label}
                                            </div>
                                            <div className="mt-1 flex items-center justify-between gap-4 text-primary-foreground/80">
                                                <span>Transactions</span>
                                                <span className="font-medium text-primary-foreground">
                                                    {point.transactions}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 text-primary-foreground/80">
                                                <span>Revenue</span>
                                                <span className="text-right font-medium text-primary-foreground">
                                                    {formatRupiah(
                                                        point.revenue,
                                                    )}
                                                </span>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>

                        <div className="flex gap-1">
                            {chart.points.map((point, index) => (
                                <span
                                    key={point.period}
                                    className={cn(
                                        'min-w-0 flex-1 truncate text-center text-[10px] text-muted-foreground',
                                        !shouldShowChartLabel(
                                            activeRange,
                                            index,
                                            chart.points.length,
                                        ) && 'text-transparent',
                                    )}
                                >
                                    {point.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <Status
                        label="Transactions"
                        value={chart.total_transactions}
                    />
                    <div className="rounded-md border border-border/70 bg-background px-3 py-2">
                        <span className="text-sm text-muted-foreground">
                            Revenue
                        </span>
                        <div className="mt-1 font-semibold break-words">
                            {formatRupiah(chart.total_revenue)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

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
            className={cn(
                'min-w-0 rounded-lg border border-border/70 bg-card p-4 text-card-foreground shadow-xs',
                className,
            )}
        >
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="mt-2 text-2xl leading-tight font-semibold break-words">
                {value}
            </div>
        </div>
    );
}

function shouldShowChartLabel(
    activeRange: TransactionChartRange,
    index: number,
    totalPoints: number,
): boolean {
    if (activeRange !== 'last_30_days') {
        return true;
    }

    return index === 0 || index === totalPoints - 1 || index % 5 === 0;
}

function Status({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background px-3 py-2">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="font-semibold tabular-nums">{value}</span>
        </div>
    );
}
