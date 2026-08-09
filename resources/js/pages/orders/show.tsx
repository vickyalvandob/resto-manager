import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Ban, CreditCard, Printer } from 'lucide-react';
import { useState } from 'react';
import { store as payOrder } from '@/actions/App/Http/Controllers/Orders/PaymentController';
import { store as voidOrder } from '@/actions/App/Http/Controllers/Orders/VoidOrderController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRupiah } from '@/lib/currency';
import { formatDateTime } from '@/lib/date';
import { index as ordersIndex } from '@/routes/orders';
import type { OrderDetail, PaymentMethod } from '@/types';

type OrderShowProps = {
    order: OrderDetail;
};

const paymentLabels: Record<PaymentMethod, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    transfer: 'Transfer',
};

export default function OrderShow({ order }: OrderShowProps) {
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [voidOpen, setVoidOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [paidAmount, setPaidAmount] = useState('');
    const [voidReason, setVoidReason] = useState('');
    const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>(
        {},
    );
    const [voidErrors, setVoidErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const changeAmount = Math.max(
        Number(paidAmount || 0) - order.grand_total,
        0,
    );

    function submitPayment(): void {
        setProcessing(true);
        setPaymentErrors({});

        router.post(
            payOrder(order.id),
            {
                payment_method: paymentMethod,
                paid_amount:
                    paymentMethod === 'cash' ? Number(paidAmount || 0) : null,
            },
            {
                preserveScroll: true,
                onError: (errors) => setPaymentErrors(errors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    function submitVoid(): void {
        setProcessing(true);
        setVoidErrors({});

        router.post(
            voidOrder(order.id),
            {
                void_reason: voidReason,
            },
            {
                preserveScroll: true,
                onError: (errors) => setVoidErrors(errors),
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <>
            <Head title={order.invoice_number} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold">
                                {order.invoice_number}
                            </h1>
                            <Badge
                                variant={
                                    order.status === 'paid'
                                        ? 'secondary'
                                        : order.status === 'void'
                                          ? 'outline'
                                          : 'default'
                                }
                            >
                                {order.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Queue {order.queue_number} -{' '}
                            {formatDateTime(order.created_at)}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <Link href={ordersIndex()}>
                                <ArrowLeft />
                                Back
                            </Link>
                        </Button>
                        {order.status === 'open' && (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setVoidOpen(true)}
                                >
                                    <Ban />
                                    Void
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => setPaymentOpen(true)}
                                >
                                    <CreditCard />
                                    Bayar Sekarang
                                </Button>
                            </>
                        )}
                        {order.status === 'paid' && (
                            <Button asChild>
                                <a
                                    href={order.receipt_url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Printer />
                                    Cetak Struk
                                </a>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                    <section className="overflow-hidden rounded-lg border bg-background">
                        <div className="border-b px-4 py-3">
                            <h2 className="font-semibold">Items</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Product</th>
                                        <th className="px-4 py-3">Qty</th>
                                        <th className="px-4 py-3">Price</th>
                                        <th className="px-4 py-3">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {order.items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-4">
                                                <div className="font-medium">
                                                    {item.product_name}
                                                </div>
                                                {item.note && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.note}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                {item.qty}
                                            </td>
                                            <td className="px-4 py-4">
                                                {formatRupiah(item.price)}
                                            </td>
                                            <td className="px-4 py-4 font-medium">
                                                {formatRupiah(item.subtotal)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <aside className="grid gap-4">
                        <div className="rounded-lg border bg-background p-4">
                            <h2 className="font-semibold">Order</h2>
                            <dl className="mt-3 grid gap-2 text-sm">
                                <Detail
                                    label="Cashier"
                                    value={order.cashier.name}
                                />
                                <Detail
                                    label="Customer"
                                    value={order.customer_name || '-'}
                                />
                                <Detail
                                    label="Order Type"
                                    value={
                                        order.order_type === 'dine_in'
                                            ? 'Dine In'
                                            : 'Take Away'
                                    }
                                />
                            </dl>
                        </div>

                        <div className="rounded-lg border bg-background p-4">
                            <h2 className="font-semibold">Summary</h2>
                            <dl className="mt-3 grid gap-2 text-sm">
                                <Detail
                                    label="Subtotal"
                                    value={formatRupiah(order.subtotal)}
                                />
                                <Detail
                                    label="Grand Total"
                                    value={formatRupiah(order.grand_total)}
                                    strong
                                />
                            </dl>
                        </div>

                        <div className="rounded-lg border bg-background p-4">
                            <h2 className="font-semibold">Payment</h2>
                            <dl className="mt-3 grid gap-2 text-sm">
                                <Detail
                                    label="Method"
                                    value={order.payment_method || '-'}
                                />
                                <Detail
                                    label="Paid"
                                    value={formatRupiah(order.paid_amount)}
                                />
                                <Detail
                                    label="Change"
                                    value={formatRupiah(order.change_amount)}
                                />
                                <Detail
                                    label="Paid At"
                                    value={formatDateTime(order.paid_at)}
                                />
                            </dl>
                        </div>

                        {order.status === 'void' && (
                            <div className="rounded-lg border bg-background p-4">
                                <h2 className="font-semibold">Void</h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {order.void_reason}
                                </p>
                            </div>
                        )}
                    </aside>
                </div>
            </div>

            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bayar Sekarang</DialogTitle>
                        <DialogDescription>
                            Total {formatRupiah(order.grand_total)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid grid-cols-3 gap-2">
                            {(
                                Object.keys(paymentLabels) as PaymentMethod[]
                            ).map((method) => (
                                <Button
                                    key={method}
                                    type="button"
                                    variant={
                                        paymentMethod === method
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() => setPaymentMethod(method)}
                                >
                                    {paymentLabels[method]}
                                </Button>
                            ))}
                        </div>
                        <InputError message={paymentErrors.payment_method} />

                        {paymentMethod === 'cash' && (
                            <div className="grid gap-2">
                                <Label htmlFor="paid_amount">
                                    Uang Diterima
                                </Label>
                                <Input
                                    id="paid_amount"
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={paidAmount}
                                    onChange={(event) =>
                                        setPaidAmount(event.target.value)
                                    }
                                />
                                <InputError
                                    message={paymentErrors.paid_amount}
                                />
                                <div className="flex justify-between rounded-md bg-muted px-3 py-2 text-sm font-medium">
                                    <span>Kembalian</span>
                                    <span>{formatRupiah(changeAmount)}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={processing}
                            onClick={() => setPaymentOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={
                                processing ||
                                (paymentMethod === 'cash' &&
                                    Number(paidAmount || 0) < order.grand_total)
                            }
                            onClick={submitPayment}
                        >
                            {processing ? 'Processing...' : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Void Order</DialogTitle>
                        <DialogDescription>
                            Void hanya berlaku untuk order open.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="void_reason">Reason</Label>
                        <Input
                            id="void_reason"
                            value={voidReason}
                            onChange={(event) =>
                                setVoidReason(event.target.value)
                            }
                        />
                        <InputError message={voidErrors.void_reason} />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={processing}
                            onClick={() => setVoidOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={processing || voidReason.trim() === ''}
                            onClick={submitVoid}
                        >
                            Void
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
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
        <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={strong ? 'font-semibold' : 'font-medium'}>
                {value}
            </dd>
        </div>
    );
}

OrderShow.layout = {
    breadcrumbs: [
        {
            title: 'Orders',
            href: ordersIndex(),
        },
    ],
};
