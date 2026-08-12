import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Ban,
    Banknote,
    CheckCircle2,
    Clock3,
    CreditCard,
    ImageIcon,
    Minus,
    PackageSearch,
    Plus,
    Printer,
    Search,
    Trash2,
    WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { store as addOrderItems } from '@/actions/App/Http/Controllers/Orders/OrderItemController';
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
import { cn } from '@/lib/utils';
import { index as ordersIndex } from '@/routes/orders';
import type {
    OrderDetail,
    OrderStatus,
    OrderType,
    PaymentMethod,
    PosProduct,
} from '@/types';

type OrderShowProps = {
    order: OrderDetail;
    products: PosProduct[];
};

type PaymentOption = {
    value: PaymentMethod;
    label: string;
    icon: LucideIcon;
};

type AddedItem = {
    product_id: number;
    name: string;
    price: number;
    qty: number;
    note: string;
    category_name: string;
};

const paymentLabels: Record<PaymentMethod, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    transfer: 'Transfer',
};

const paymentOptions: PaymentOption[] = [
    { value: 'cash', label: paymentLabels.cash, icon: Banknote },
    { value: 'qris', label: paymentLabels.qris, icon: WalletCards },
    { value: 'transfer', label: paymentLabels.transfer, icon: CreditCard },
];

const orderTypeLabels: Record<OrderType, string> = {
    dine_in: 'Dine In',
    take_away: 'Take Away',
};

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

function quickCashAmounts(total: number): number[] {
    const roundedAmount = Math.ceil(total / 10000) * 10000;

    return Array.from(
        new Set([
            total,
            roundedAmount,
            roundedAmount + 10000,
            roundedAmount + 50000,
        ]),
    ).filter((amount) => amount > 0);
}

function paymentMethodLabel(paymentMethod: PaymentMethod | null): string {
    return paymentMethod ? paymentLabels[paymentMethod] : '-';
}

export default function OrderShow({ order, products }: OrderShowProps) {
    const [addItemsOpen, setAddItemsOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [voidOpen, setVoidOpen] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [addItems, setAddItems] = useState<AddedItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [paidAmount, setPaidAmount] = useState('');
    const [voidReason, setVoidReason] = useState('');
    const [addItemErrors, setAddItemErrors] = useState<Record<string, string>>(
        {},
    );
    const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>(
        {},
    );
    const [voidErrors, setVoidErrors] = useState<Record<string, string>>({});
    const [addItemsProcessing, setAddItemsProcessing] = useState(false);
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [voidProcessing, setVoidProcessing] = useState(false);

    const filteredProducts = useMemo(() => {
        const normalizedSearch = productSearch.trim().toLowerCase();

        if (normalizedSearch === '') {
            return products;
        }

        return products.filter(
            (product) =>
                product.name.toLowerCase().includes(normalizedSearch) ||
                product.category.name.toLowerCase().includes(normalizedSearch),
        );
    }, [productSearch, products]);
    const addItemsSubtotal = useMemo(
        () =>
            addItems.reduce((total, item) => total + item.price * item.qty, 0),
        [addItems],
    );
    const addItemsCount = useMemo(
        () => addItems.reduce((total, item) => total + item.qty, 0),
        [addItems],
    );
    const changeAmount = Math.max(
        Number(paidAmount || 0) - order.grand_total,
        0,
    );
    const suggestedCashAmounts = useMemo(
        () => quickCashAmounts(order.grand_total),
        [order.grand_total],
    );
    const isCashPaymentIncomplete =
        paymentMethod === 'cash' && Number(paidAmount || 0) < order.grand_total;
    const StatusIcon = statusIcons[order.status];
    const addItemsError =
        addItemErrors.items ||
        addItemErrors['items.0.product_id'] ||
        addItemErrors['items.0.qty'] ||
        addItemErrors['items.0.note'];

    function openAddItemsDialog(): void {
        setAddItemErrors({});
        setAddItemsOpen(true);
    }

    function openPaymentDialog(): void {
        setPaymentErrors({});
        setPaymentOpen(true);
    }

    function openVoidDialog(): void {
        setVoidErrors({});
        setVoidOpen(true);
    }

    function selectedProductQty(productId: number): number {
        return addItems.find((item) => item.product_id === productId)?.qty ?? 0;
    }

    function addProduct(product: PosProduct): void {
        setAddItemErrors({});
        setAddItems((items) => {
            const existingItem = items.find(
                (item) => item.product_id === product.id,
            );

            if (!existingItem) {
                return [
                    ...items,
                    {
                        product_id: product.id,
                        name: product.name,
                        price: product.price,
                        qty: 1,
                        note: '',
                        category_name: product.category.name,
                    },
                ];
            }

            return items.map((item) =>
                item.product_id === product.id
                    ? { ...item, qty: item.qty + 1 }
                    : item,
            );
        });
    }

    function changeAddedItemQty(productId: number, qty: number): void {
        setAddItemErrors({});
        setAddItems((items) =>
            items
                .map((item) =>
                    item.product_id === productId ? { ...item, qty } : item,
                )
                .filter((item) => item.qty > 0),
        );
    }

    function changeAddedItemNote(productId: number, note: string): void {
        setAddItems((items) =>
            items.map((item) =>
                item.product_id === productId ? { ...item, note } : item,
            ),
        );
    }

    function resetAddItems(): void {
        setAddItems([]);
        setProductSearch('');
        setAddItemErrors({});
    }

    function submitAddItems(): void {
        if (addItemsProcessing || addItems.length === 0) {
            return;
        }

        setAddItemsProcessing(true);
        setAddItemErrors({});

        router.post(
            addOrderItems(order.id),
            {
                items: addItems.map((item) => ({
                    product_id: item.product_id,
                    qty: item.qty,
                    note: item.note || null,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAddItemsOpen(false);
                    resetAddItems();
                },
                onError: (errors) => setAddItemErrors(errors),
                onFinish: () => setAddItemsProcessing(false),
            },
        );
    }

    function submitPayment(): void {
        if (paymentProcessing) {
            return;
        }

        setPaymentProcessing(true);
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
                onSuccess: () => {
                    setPaymentOpen(false);
                    setPaidAmount('');
                    setPaymentErrors({});
                },
                onError: (errors) => setPaymentErrors(errors),
                onFinish: () => setPaymentProcessing(false),
            },
        );
    }

    function submitVoid(): void {
        if (voidProcessing) {
            return;
        }

        setVoidProcessing(true);
        setVoidErrors({});

        router.post(
            voidOrder(order.id),
            {
                void_reason: voidReason,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setVoidOpen(false);
                    setVoidReason('');
                    setVoidErrors({});
                },
                onError: (errors) => setVoidErrors(errors),
                onFinish: () => setVoidProcessing(false),
            },
        );
    }

    return (
        <>
            <Head title={order.invoice_number} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-y-auto p-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold">
                                {order.invoice_number}
                            </h1>
                            <Badge variant={statusBadgeVariant(order.status)}>
                                <StatusIcon />
                                {statusLabels[order.status]}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Antrean {order.queue_number} -{' '}
                            {formatDateTime(order.created_at)}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" asChild>
                            <Link href={ordersIndex()}>
                                <ArrowLeft />
                                Kembali
                            </Link>
                        </Button>
                        {order.status === 'open' && (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={openAddItemsDialog}
                                >
                                    <Plus />
                                    Tambah Pesanan
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={openVoidDialog}
                                >
                                    <Ban />
                                    Void
                                </Button>
                                <Button
                                    type="button"
                                    onClick={openPaymentDialog}
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

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <section className="overflow-hidden rounded-lg border bg-background">
                        <div className="flex flex-col justify-between gap-2 border-b px-4 py-3 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="font-semibold">Item Pesanan</h2>
                                <p className="text-xs text-muted-foreground">
                                    Harga tersimpan mengikuti saat order dibuat.
                                </p>
                            </div>
                            <Badge variant="outline">
                                {order.items.length} item
                            </Badge>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Produk</th>
                                        <th className="px-4 py-3">Qty</th>
                                        <th className="px-4 py-3">Harga</th>
                                        <th className="px-4 py-3">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {order.items.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-muted/30"
                                        >
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
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                {formatRupiah(item.price)}
                                            </td>
                                            <td className="px-4 py-4 font-medium whitespace-nowrap">
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
                            <h2 className="font-semibold">Detail Order</h2>
                            <dl className="mt-3 grid gap-2 text-sm">
                                <Detail
                                    label="Invoice"
                                    value={order.invoice_number}
                                />
                                <Detail
                                    label="Antrean"
                                    value={order.queue_number}
                                />
                                <Detail
                                    label="Pelanggan"
                                    value={order.customer_name || '-'}
                                />
                                <Detail
                                    label="Tipe"
                                    value={orderTypeLabels[order.order_type]}
                                />
                                <Detail
                                    label="Kasir"
                                    value={order.cashier.name}
                                />
                            </dl>
                        </div>

                        <div className="rounded-lg border bg-background p-4">
                            <h2 className="font-semibold">Ringkasan</h2>
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
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="font-semibold">Pembayaran</h2>
                                <Badge
                                    variant={statusBadgeVariant(order.status)}
                                >
                                    {statusLabels[order.status]}
                                </Badge>
                            </div>
                            <dl className="mt-3 grid gap-2 text-sm">
                                <Detail
                                    label="Metode"
                                    value={paymentMethodLabel(
                                        order.payment_method,
                                    )}
                                />
                                <Detail
                                    label="Dibayar"
                                    value={formatRupiah(order.paid_amount)}
                                />
                                <Detail
                                    label="Kembalian"
                                    value={formatRupiah(order.change_amount)}
                                />
                                <Detail
                                    label="Waktu Bayar"
                                    value={formatDateTime(order.paid_at)}
                                />
                            </dl>
                            {order.status === 'open' && (
                                <Button
                                    type="button"
                                    className="mt-4 w-full"
                                    onClick={openPaymentDialog}
                                >
                                    <CreditCard />
                                    Bayar Sekarang
                                </Button>
                            )}
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

            {order.status === 'open' && (
                <Dialog
                    open={addItemsOpen}
                    onOpenChange={(open) => {
                        setAddItemsOpen(open);

                        if (!open) {
                            setAddItemErrors({});
                        }
                    }}
                >
                    <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Tambah Pesanan</DialogTitle>
                            <DialogDescription>
                                {order.invoice_number} - subtotal saat ini{' '}
                                {formatRupiah(order.grand_total)}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                            <section className="grid gap-3">
                                <div className="relative">
                                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={productSearch}
                                        onChange={(event) =>
                                            setProductSearch(event.target.value)
                                        }
                                        placeholder="Cari produk atau kategori"
                                        className="h-10 pl-9"
                                    />
                                </div>

                                {filteredProducts.length > 0 ? (
                                    <div className="grid max-h-96 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                                        {filteredProducts.map((product) => {
                                            const quantity = selectedProductQty(
                                                product.id,
                                            );

                                            return (
                                                <button
                                                    key={product.id}
                                                    type="button"
                                                    onClick={() =>
                                                        addProduct(product)
                                                    }
                                                    className="grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-3 rounded-lg border bg-background p-2 text-left transition hover:border-primary/50 hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                                >
                                                    <div className="overflow-hidden rounded-md bg-muted">
                                                        {product.image_url ? (
                                                            <img
                                                                src={
                                                                    product.image_url
                                                                }
                                                                alt={
                                                                    product.name
                                                                }
                                                                className="aspect-square size-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex aspect-square size-full items-center justify-center text-muted-foreground">
                                                                <ImageIcon className="size-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="line-clamp-2 text-sm font-medium">
                                                            {product.name}
                                                        </div>
                                                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                                            {
                                                                product.category
                                                                    .name
                                                            }
                                                        </div>
                                                        <div className="mt-1 text-sm font-semibold text-primary">
                                                            {formatRupiah(
                                                                product.price,
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                                                        {quantity > 0 ? (
                                                            <span className="text-xs font-semibold">
                                                                x{quantity}
                                                            </span>
                                                        ) : (
                                                            <Plus className="size-4" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                                        <PackageSearch className="size-9" />
                                        <span>Produk tidak ditemukan.</span>
                                    </div>
                                )}
                            </section>

                            <section className="grid content-start gap-3 rounded-lg border p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-semibold">
                                            Item Tambahan
                                        </h3>
                                        <p className="text-xs text-muted-foreground">
                                            {addItemsCount} item
                                        </p>
                                    </div>
                                    <Badge variant="outline">
                                        {formatRupiah(addItemsSubtotal)}
                                    </Badge>
                                </div>

                                {addItems.length > 0 ? (
                                    <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                                        {addItems.map((item) => (
                                            <div
                                                key={item.product_id}
                                                className="grid gap-2 rounded-md border p-2"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-medium">
                                                            {item.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {item.category_name}
                                                        </div>
                                                    </div>
                                                    <div className="text-sm font-semibold whitespace-nowrap">
                                                        {formatRupiah(
                                                            item.price *
                                                                item.qty,
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="outline"
                                                            className="size-8"
                                                            onClick={() =>
                                                                changeAddedItemQty(
                                                                    item.product_id,
                                                                    item.qty -
                                                                        1,
                                                                )
                                                            }
                                                            aria-label={`Kurangi ${item.name}`}
                                                        >
                                                            <Minus />
                                                        </Button>
                                                        <div className="flex size-8 items-center justify-center rounded-md border text-sm font-semibold">
                                                            {item.qty}
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="outline"
                                                            className="size-8"
                                                            onClick={() =>
                                                                changeAddedItemQty(
                                                                    item.product_id,
                                                                    item.qty +
                                                                        1,
                                                                )
                                                            }
                                                            aria-label={`Tambah ${item.name}`}
                                                        >
                                                            <Plus />
                                                        </Button>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="size-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() =>
                                                            changeAddedItemQty(
                                                                item.product_id,
                                                                0,
                                                            )
                                                        }
                                                        aria-label={`Hapus ${item.name}`}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </div>

                                                <Input
                                                    value={item.note}
                                                    onChange={(event) =>
                                                        changeAddedItemNote(
                                                            item.product_id,
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Catatan item"
                                                    className="h-8"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-md bg-muted/40 text-center text-sm text-muted-foreground">
                                        <Plus className="size-6" />
                                        <span>Belum ada item tambahan.</span>
                                    </div>
                                )}

                                <InputError message={addItemsError} />

                                <dl className="grid gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
                                    <Detail
                                        label="Subtotal tambahan"
                                        value={formatRupiah(addItemsSubtotal)}
                                    />
                                    <Detail
                                        label="Total baru"
                                        value={formatRupiah(
                                            order.grand_total +
                                                addItemsSubtotal,
                                        )}
                                        strong
                                    />
                                </dl>
                            </section>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={addItemsProcessing}
                                onClick={() => setAddItemsOpen(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={
                                    addItemsProcessing || addItems.length === 0
                                }
                                onClick={resetAddItems}
                            >
                                Reset
                            </Button>
                            <Button
                                type="button"
                                disabled={
                                    addItemsProcessing || addItems.length === 0
                                }
                                onClick={submitAddItems}
                            >
                                {addItemsProcessing
                                    ? 'Memproses...'
                                    : 'Tambah ke Order'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Bayar Sekarang</DialogTitle>
                        <DialogDescription>
                            {order.invoice_number} - total tagihan{' '}
                            {formatRupiah(order.grand_total)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <dl className="grid gap-2 rounded-lg bg-muted/60 p-3">
                            <Detail
                                label="Antrean"
                                value={order.queue_number}
                            />
                            <Detail
                                label="Grand Total"
                                value={formatRupiah(order.grand_total)}
                                strong
                            />
                        </dl>

                        <div className="grid gap-2">
                            <Label>Metode pembayaran</Label>
                            <div className="grid gap-2 sm:grid-cols-3">
                                {paymentOptions.map(
                                    ({ value, label, icon: Icon }) => (
                                        <Button
                                            key={value}
                                            type="button"
                                            variant={
                                                paymentMethod === value
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            className="h-11"
                                            onClick={() => {
                                                setPaymentMethod(value);
                                                setPaymentErrors({});
                                            }}
                                        >
                                            <Icon />
                                            {label}
                                        </Button>
                                    ),
                                )}
                            </div>
                            <InputError
                                message={paymentErrors.payment_method}
                            />
                        </div>

                        {paymentMethod === 'cash' && (
                            <div className="grid gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="paid_amount">
                                        Uang diterima
                                    </Label>
                                    <Input
                                        id="paid_amount"
                                        type="number"
                                        inputMode="numeric"
                                        min="0"
                                        step="1000"
                                        value={paidAmount}
                                        onChange={(event) =>
                                            setPaidAmount(event.target.value)
                                        }
                                        className={cn(
                                            isCashPaymentIncomplete &&
                                                'border-destructive',
                                        )}
                                    />
                                    <InputError
                                        message={paymentErrors.paid_amount}
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {suggestedCashAmounts.map((amount) => (
                                        <Button
                                            key={amount}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setPaidAmount(String(amount))
                                            }
                                        >
                                            {amount === order.grand_total
                                                ? 'Uang pas'
                                                : formatRupiah(amount)}
                                        </Button>
                                    ))}
                                </div>
                                <div className="flex justify-between rounded-md bg-muted px-3 py-2 text-sm font-medium">
                                    <span>Kembalian</span>
                                    <span>{formatRupiah(changeAmount)}</span>
                                </div>
                            </div>
                        )}

                        {paymentMethod !== 'cash' && (
                            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">
                                    {paymentLabels[paymentMethod]}
                                </span>{' '}
                                akan dicatat lunas tanpa kembalian.
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={paymentProcessing}
                            onClick={() => setPaymentOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            disabled={
                                paymentProcessing || isCashPaymentIncomplete
                            }
                            onClick={submitPayment}
                        >
                            {paymentProcessing
                                ? 'Memproses...'
                                : 'Konfirmasi Pembayaran'}
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
                            disabled={voidProcessing}
                            onClick={() => setVoidOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={
                                voidProcessing || voidReason.trim() === ''
                            }
                            onClick={submitVoid}
                        >
                            {voidProcessing ? 'Memproses...' : 'Void'}
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

OrderShow.layout = {
    breadcrumbs: [
        {
            title: 'Orders',
            href: ordersIndex(),
        },
    ],
};
