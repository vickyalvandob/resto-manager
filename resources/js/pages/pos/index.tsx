import { Head, router } from '@inertiajs/react';
import {
    ImageIcon,
    Minus,
    Plus,
    Printer,
    ReceiptText,
    RotateCcw,
    Save,
    Search,
    ShoppingCart,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { store as storeOrder } from '@/actions/App/Http/Controllers/POS/CheckoutController';
import InputError from '@/components/input-error';
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
import { cn } from '@/lib/utils';
import { index as posIndex } from '@/routes/pos';
import type {
    OrderSuccess,
    OrderType,
    PaymentMethod,
    PosCategory,
    PosProduct,
} from '@/types';

type PosIndexProps = {
    categories: PosCategory[];
    products: PosProduct[];
};

type CartItem = {
    product_id: number;
    name: string;
    price: number;
    qty: number;
    note: string;
    image_url: string | null;
};

type CheckoutErrors = Record<string, string>;

const paymentLabels: Record<PaymentMethod, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    transfer: 'Transfer',
};

const orderTypeLabels: Record<OrderType, string> = {
    dine_in: 'Dine In',
    take_away: 'Take Away',
};

export default function PosIndex({ categories, products }: PosIndexProps) {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [orderType, setOrderType] = useState<OrderType>('dine_in');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [paidAmount, setPaidAmount] = useState('');
    const [errors, setErrors] = useState<CheckoutErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successOrder, setSuccessOrder] = useState<OrderSuccess | null>(null);

    const cartTotal = cart.reduce(
        (total, item) => total + item.price * item.qty,
        0,
    );
    const changeAmount = Math.max(Number(paidAmount || 0) - cartTotal, 0);

    const filteredProducts = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return products.filter((product) => {
            const matchesCategory =
                activeCategory === 'all' ||
                product.category_id === activeCategory;
            const matchesSearch =
                normalizedSearch === '' ||
                product.name.toLowerCase().includes(normalizedSearch);

            return matchesCategory && matchesSearch;
        });
    }, [activeCategory, products, search]);

    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const order = flash?.order as OrderSuccess | undefined;

            if (!order) {
                return;
            }

            setCart([]);
            setPaymentOpen(false);
            setSuccessOrder(order);
            setPaidAmount('');
            setCustomerName('');
            setErrors({});
        });
    }, []);

    function addProduct(product: PosProduct): void {
        setCart((items) => {
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
                        image_url: product.image_url,
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

    function changeQty(productId: number, qty: number): void {
        setCart((items) =>
            items
                .map((item) =>
                    item.product_id === productId ? { ...item, qty } : item,
                )
                .filter((item) => item.qty > 0),
        );
    }

    function changeNote(productId: number, note: string): void {
        setCart((items) =>
            items.map((item) =>
                item.product_id === productId ? { ...item, note } : item,
            ),
        );
    }

    function checkoutPayload(payment?: PaymentMethod) {
        return {
            customer_name: customerName || null,
            order_type: payment ? orderType : 'dine_in',
            payment_method: payment ?? null,
            paid_amount: payment === 'cash' ? Number(paidAmount || 0) : null,
            items: cart.map((item) => ({
                product_id: item.product_id,
                qty: item.qty,
                note: item.note || null,
            })),
        };
    }

    function saveOrder(): void {
        if (cart.length === 0 || isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        router.post(storeOrder(), checkoutPayload(), {
            preserveScroll: true,
            onSuccess: () => router.flushAll(),
            onError: (formErrors) => setErrors(formErrors),
            onFinish: () => setIsSubmitting(false),
        });
    }

    function submitPayment(): void {
        if (cart.length === 0 || isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        router.post(storeOrder(), checkoutPayload(paymentMethod), {
            preserveScroll: true,
            onSuccess: () => router.flushAll(),
            onError: (formErrors) => setErrors(formErrors),
            onFinish: () => setIsSubmitting(false),
        });
    }

    return (
        <>
            <Head title="POS" />

            <div className="grid h-[calc(100vh-4rem)] min-h-0 grid-rows-[minmax(0,1fr)_minmax(20rem,0.85fr)] gap-4 overflow-hidden p-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:grid-rows-1">
                <section className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
                    <div className="flex shrink-0 flex-col gap-3 rounded-lg border bg-background p-4 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search product"
                                className="h-11 pl-9"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 sm:max-w-[55%]">
                            <Button
                                type="button"
                                variant={
                                    activeCategory === 'all'
                                        ? 'default'
                                        : 'outline'
                                }
                                className="h-11 shrink-0"
                                onClick={() => setActiveCategory('all')}
                            >
                                All
                            </Button>
                            {categories.map((category) => (
                                <Button
                                    key={category.id}
                                    type="button"
                                    variant={
                                        activeCategory === category.id
                                            ? 'default'
                                            : 'outline'
                                    }
                                    className="h-11 shrink-0"
                                    onClick={() =>
                                        setActiveCategory(category.id)
                                    }
                                >
                                    {category.name}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div
                        className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 pb-2 md:grid-cols-3 2xl:grid-cols-4"
                        scroll-region=""
                    >
                        {filteredProducts.map((product) => (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => addProduct(product)}
                                className="group grid min-h-44 overflow-hidden rounded-lg border bg-background text-left shadow-xs transition hover:border-primary/50 hover:bg-muted/20 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                            >
                                <div className="aspect-[4/3] bg-muted">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex size-full items-center justify-center text-muted-foreground">
                                            <ImageIcon className="size-8" />
                                        </div>
                                    )}
                                </div>
                                <div className="grid gap-1 p-3">
                                    <span className="line-clamp-2 min-h-10 leading-5 font-medium">
                                        {product.name}
                                    </span>
                                    <span className="text-sm font-semibold text-primary">
                                        {formatRupiah(product.price)}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background">
                    <div className="flex shrink-0 items-center justify-between border-b p-4">
                        <div>
                            <h1 className="text-xl font-semibold">Cart</h1>
                            <p className="text-sm text-muted-foreground">
                                {cart.length} item{cart.length === 1 ? '' : 's'}
                            </p>
                        </div>
                        <ShoppingCart className="size-5 text-muted-foreground" />
                    </div>

                    <div
                        className="min-h-0 flex-1 overflow-y-auto p-4"
                        scroll-region=""
                    >
                        {cart.length === 0 ? (
                            <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                                <ShoppingCart className="size-10" />
                                <span>Cart is empty.</span>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {cart.map((item) => (
                                    <div
                                        key={item.product_id}
                                        className="grid gap-3 rounded-lg border p-3"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate font-medium">
                                                    {item.name}
                                                </div>
                                                <div className="mt-1 text-sm text-muted-foreground">
                                                    {item.qty} x{' '}
                                                    {formatRupiah(item.price)}
                                                </div>
                                            </div>
                                            <div className="font-semibold whitespace-nowrap">
                                                {formatRupiah(
                                                    item.price * item.qty,
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className="size-10"
                                                    onClick={() =>
                                                        changeQty(
                                                            item.product_id,
                                                            item.qty - 1,
                                                        )
                                                    }
                                                >
                                                    <Minus />
                                                </Button>
                                                <div className="flex size-10 items-center justify-center rounded-md border text-sm font-semibold">
                                                    {item.qty}
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className="size-10"
                                                    onClick={() =>
                                                        changeQty(
                                                            item.product_id,
                                                            item.qty + 1,
                                                        )
                                                    }
                                                >
                                                    <Plus />
                                                </Button>
                                            </div>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="size-10 text-muted-foreground"
                                                onClick={() =>
                                                    changeQty(
                                                        item.product_id,
                                                        0,
                                                    )
                                                }
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>

                                        <Input
                                            value={item.note}
                                            onChange={(event) =>
                                                changeNote(
                                                    item.product_id,
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Note"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid shrink-0 gap-4 border-t p-4">
                        <InputError
                            message={
                                errors.items ||
                                errors['items.0.product_id'] ||
                                errors.order_type
                            }
                        />
                        <div className="flex items-center justify-between text-lg font-semibold">
                            <span>Total</span>
                            <span>{formatRupiah(cartTotal)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-12"
                                disabled={cart.length === 0 || isSubmitting}
                                onClick={() => setCart([])}
                            >
                                <RotateCcw />
                                Reset
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-12"
                                disabled={cart.length === 0 || isSubmitting}
                                onClick={saveOrder}
                            >
                                <Save />
                                Simpan
                            </Button>
                            <Button
                                type="button"
                                className="h-12"
                                disabled={cart.length === 0 || isSubmitting}
                                onClick={() => setPaymentOpen(true)}
                            >
                                <ReceiptText />
                                Bayar
                            </Button>
                        </div>
                    </div>
                </aside>
            </div>

            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Payment</DialogTitle>
                        <DialogDescription>
                            Total {formatRupiah(cartTotal)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="customer_name">Customer Name</Label>
                            <Input
                                id="customer_name"
                                value={customerName}
                                onChange={(event) =>
                                    setCustomerName(event.target.value)
                                }
                                autoComplete="off"
                            />
                            <InputError message={errors.customer_name} />
                        </div>

                        <div className="grid gap-2">
                            <Label>Order Type</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {(
                                    Object.keys(orderTypeLabels) as OrderType[]
                                ).map((type) => (
                                    <Button
                                        key={type}
                                        type="button"
                                        variant={
                                            orderType === type
                                                ? 'default'
                                                : 'outline'
                                        }
                                        className="h-11"
                                        onClick={() => setOrderType(type)}
                                    >
                                        {orderTypeLabels[type]}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Payment Method</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {(
                                    Object.keys(
                                        paymentLabels,
                                    ) as PaymentMethod[]
                                ).map((method) => (
                                    <Button
                                        key={method}
                                        type="button"
                                        variant={
                                            paymentMethod === method
                                                ? 'default'
                                                : 'outline'
                                        }
                                        className="h-11"
                                        onClick={() => setPaymentMethod(method)}
                                    >
                                        {paymentLabels[method]}
                                    </Button>
                                ))}
                            </div>
                            <InputError message={errors.payment_method} />
                        </div>

                        <div className="grid gap-2 rounded-lg border p-3">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>{formatRupiah(cartTotal)}</span>
                            </div>
                            <div className="flex justify-between text-base font-semibold">
                                <span>Grand Total</span>
                                <span>{formatRupiah(cartTotal)}</span>
                            </div>
                        </div>

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
                                    className={cn(
                                        Number(paidAmount || 0) < cartTotal &&
                                            'border-destructive',
                                    )}
                                />
                                <InputError message={errors.paid_amount} />
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
                            onClick={() => setPaymentOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={submitPayment}
                            disabled={
                                isSubmitting ||
                                cart.length === 0 ||
                                (paymentMethod === 'cash' &&
                                    Number(paidAmount || 0) < cartTotal)
                            }
                        >
                            {isSubmitting ? 'Processing...' : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={successOrder !== null}
                onOpenChange={(open) => !open && setSuccessOrder(null)}
            >
                <DialogContent>
                    {successOrder && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Order Saved</DialogTitle>
                                <DialogDescription>
                                    Queue {successOrder.queue_number} -{' '}
                                    {successOrder.invoice_number}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-3 rounded-lg border p-4">
                                <div className="flex justify-between">
                                    <span>Status</span>
                                    <span className="font-semibold uppercase">
                                        {successOrder.status}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total</span>
                                    <span className="font-semibold">
                                        {formatRupiah(successOrder.grand_total)}
                                    </span>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSuccessOrder(null)}
                                >
                                    Close
                                </Button>
                                <Button asChild>
                                    <a
                                        href={successOrder.receipt_url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Printer />
                                        Print
                                    </a>
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

PosIndex.layout = {
    breadcrumbs: [
        {
            title: 'POS',
            href: posIndex(),
        },
    ],
};
