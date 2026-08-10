import { Head, router } from '@inertiajs/react';
import {
    Banknote,
    CreditCard,
    ImageIcon,
    Minus,
    PackageSearch,
    Plus,
    Printer,
    ReceiptText,
    RotateCcw,
    Save,
    Search,
    ShoppingBag,
    ShoppingCart,
    Trash2,
    Utensils,
    WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { store as storeOrder } from '@/actions/App/Http/Controllers/POS/CheckoutController';
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

type CheckoutMode = 'save' | 'pay';

type Option<T extends string> = {
    value: T;
    label: string;
    icon: LucideIcon;
};

type CartPanelProps = {
    cart: CartItem[];
    cartItemsCount: number;
    cartTotal: number;
    errors: CheckoutErrors;
    isSubmitting: boolean;
    className?: string;
    onQtyChange: (productId: number, qty: number) => void;
    onNoteChange: (productId: number, note: string) => void;
    onReset: () => void;
    onSave: () => void;
    onCheckout: () => void;
};

const paymentLabels: Record<PaymentMethod, string> = {
    cash: 'Tunai',
    qris: 'QRIS',
    transfer: 'Transfer',
};

const orderTypeLabels: Record<OrderType, string> = {
    dine_in: 'Dine In',
    take_away: 'Take Away',
};

const orderTypeOptions: Option<OrderType>[] = [
    { value: 'dine_in', label: orderTypeLabels.dine_in, icon: Utensils },
    {
        value: 'take_away',
        label: orderTypeLabels.take_away,
        icon: ShoppingBag,
    },
];

const paymentOptions: Option<PaymentMethod>[] = [
    { value: 'cash', label: paymentLabels.cash, icon: Banknote },
    { value: 'qris', label: paymentLabels.qris, icon: WalletCards },
    { value: 'transfer', label: paymentLabels.transfer, icon: CreditCard },
];

function cartItemLabel(count: number): string {
    return `${count} item`;
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

function CartPanel({
    cart,
    cartItemsCount,
    cartTotal,
    errors,
    isSubmitting,
    className,
    onQtyChange,
    onNoteChange,
    onReset,
    onSave,
    onCheckout,
}: CartPanelProps) {
    return (
        <section
            className={cn(
                'flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background',
                className,
            )}
        >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b p-2 sm:p-3">
                <div className="min-w-0">
                    <h2 className="truncate font-semibold">Pesanan</h2>
                    <p className="text-xs text-muted-foreground">
                        {cartItemLabel(cartItemsCount)}
                    </p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <ShoppingCart className="size-5" />
                </div>
            </div>

            <div
                className="min-h-0 flex-1 overflow-y-auto p-2"
                scroll-region=""
            >
                {cart.length === 0 ? (
                    <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                        <ShoppingCart className="size-9" />
                        <span>Keranjang kosong.</span>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {cart.map((item) => (
                            <div
                                key={item.product_id}
                                className="grid gap-2 rounded-lg border p-2"
                            >
                                <div className="grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-2">
                                    <div className="overflow-hidden rounded-md bg-muted">
                                        {item.image_url ? (
                                            <img
                                                src={item.image_url}
                                                alt={item.name}
                                                className="aspect-square size-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex aspect-square size-full items-center justify-center text-muted-foreground">
                                                <ImageIcon className="size-5" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium">
                                            {item.name}
                                        </div>
                                        <div className="mt-0.5 text-xs text-muted-foreground">
                                            {item.qty} x{' '}
                                            {formatRupiah(item.price)}
                                        </div>
                                    </div>
                                    <div className="text-sm font-semibold whitespace-nowrap">
                                        {formatRupiah(item.price * item.qty)}
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
                                                onQtyChange(
                                                    item.product_id,
                                                    item.qty - 1,
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
                                                onQtyChange(
                                                    item.product_id,
                                                    item.qty + 1,
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
                                            onQtyChange(item.product_id, 0)
                                        }
                                        aria-label={`Hapus ${item.name}`}
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>

                                <Input
                                    value={item.note}
                                    onChange={(event) =>
                                        onNoteChange(
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
                )}
            </div>

            <div className="grid shrink-0 gap-2 border-t p-2 sm:p-3">
                <InputError
                    message={
                        errors.items ||
                        errors['items.0.product_id'] ||
                        errors.order_type
                    }
                />
                <div className="rounded-lg bg-muted/60 p-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Item</span>
                        <span>{cartItemLabel(cartItemsCount)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between font-semibold">
                        <span>Total</span>
                        <span>{formatRupiah(cartTotal)}</span>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="h-10"
                        disabled={cart.length === 0 || isSubmitting}
                        onClick={onReset}
                    >
                        <RotateCcw />
                        Reset
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-10"
                        disabled={cart.length === 0 || isSubmitting}
                        onClick={onSave}
                    >
                        <Save />
                        Simpan
                    </Button>
                    <Button
                        type="button"
                        className="h-10"
                        disabled={cart.length === 0 || isSubmitting}
                        onClick={onCheckout}
                    >
                        <ReceiptText />
                        Bayar
                    </Button>
                </div>
            </div>
        </section>
    );
}

export default function PosIndex({ categories, products }: PosIndexProps) {
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>('pay');
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
    const cartItemsCount = cart.reduce((total, item) => total + item.qty, 0);
    const changeAmount = Math.max(Number(paidAmount || 0) - cartTotal, 0);
    const suggestedCashAmounts = useMemo(
        () => quickCashAmounts(cartTotal),
        [cartTotal],
    );
    const productCountByCategory = useMemo(() => {
        return products.reduce<Record<number, number>>((counts, product) => {
            counts[product.category_id] ??= 0;
            counts[product.category_id] += 1;

            return counts;
        }, {});
    }, [products]);

    const filteredProducts = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return products.filter((product) => {
            const matchesCategory =
                activeCategory === 'all' ||
                product.category_id === activeCategory;
            const matchesSearch =
                normalizedSearch === '' ||
                product.name.toLowerCase().includes(normalizedSearch) ||
                product.category.name.toLowerCase().includes(normalizedSearch);

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
            setCheckoutMode('pay');
            setSuccessOrder(order);
            setPaidAmount('');
            setCustomerName('');
            setOrderType('dine_in');
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
            order_type: orderType,
            payment_method: payment ?? null,
            paid_amount: payment === 'cash' ? Number(paidAmount || 0) : null,
            items: cart.map((item) => ({
                product_id: item.product_id,
                qty: item.qty,
                note: item.note || null,
            })),
        };
    }

    function resetCart(): void {
        setCart([]);
        setErrors({});
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

    function openCheckout(mode: CheckoutMode): void {
        if (cart.length === 0 || isSubmitting) {
            return;
        }

        setCheckoutMode(mode);
        setErrors({});
        setPaymentOpen(true);
    }

    function confirmCheckout(): void {
        if (checkoutMode === 'save') {
            saveOrder();

            return;
        }

        submitPayment();
    }

    function cartQuantity(productId: number): number {
        return cart.find((item) => item.product_id === productId)?.qty ?? 0;
    }

    const isCashPaymentIncomplete =
        checkoutMode === 'pay' &&
        paymentMethod === 'cash' &&
        Number(paidAmount || 0) < cartTotal;

    return (
        <>
            <Head title="POS" />

            <div className="flex h-[calc(100svh-4rem)] min-h-0 flex-col gap-2 overflow-hidden bg-muted/30 p-2 sm:gap-3 sm:p-3 lg:p-4">
                <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,0.9fr)] gap-2 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-1 2xl:grid-cols-[minmax(0,1fr)_27rem]">
                    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background">
                        <div className="grid shrink-0 gap-2 border-b p-2 sm:p-3">
                            <div className="flex gap-2 overflow-x-auto pb-1">
                                <Button
                                    type="button"
                                    variant={
                                        activeCategory === 'all'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    className="h-9 shrink-0"
                                    onClick={() => setActiveCategory('all')}
                                >
                                    Semua
                                    <Badge
                                        variant={
                                            activeCategory === 'all'
                                                ? 'secondary'
                                                : 'outline'
                                        }
                                    >
                                        {products.length}
                                    </Badge>
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
                                        className="h-9 shrink-0"
                                        onClick={() =>
                                            setActiveCategory(category.id)
                                        }
                                    >
                                        {category.name}
                                        <Badge
                                            variant={
                                                activeCategory === category.id
                                                    ? 'secondary'
                                                    : 'outline'
                                            }
                                        >
                                            {productCountByCategory[
                                                category.id
                                            ] ?? 0}
                                        </Badge>
                                    </Button>
                                ))}
                            </div>
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Cari produk atau kategori"
                                    className="h-10 pl-9"
                                />
                            </div>
                        </div>

                        {filteredProducts.length > 0 ? (
                            <div
                                className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                                scroll-region=""
                            >
                                {filteredProducts.map((product) => {
                                    const quantity = cartQuantity(product.id);

                                    return (
                                        <button
                                            key={product.id}
                                            type="button"
                                            onClick={() => addProduct(product)}
                                            className="group relative flex min-h-0 flex-col overflow-hidden rounded-lg border bg-background text-left shadow-xs transition hover:border-primary/50 hover:bg-muted/20 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                        >
                                            <div className="relative aspect-[5/3] bg-muted">
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        className="size-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex size-full items-center justify-center text-muted-foreground">
                                                        <ImageIcon className="size-7" />
                                                    </div>
                                                )}
                                                {quantity > 0 && (
                                                    <Badge className="absolute top-1.5 right-1.5 shadow-sm">
                                                        x{quantity}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex min-h-22 flex-1 flex-col gap-1.5 p-2">
                                                <div className="min-w-0 flex-1">
                                                    <span className="line-clamp-2 text-sm leading-5 font-medium">
                                                        {product.name}
                                                    </span>
                                                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                                        {product.category.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="truncate text-xs font-semibold text-primary sm:text-sm">
                                                        {formatRupiah(
                                                            product.price,
                                                        )}
                                                    </span>
                                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition group-hover:bg-primary/90">
                                                        <Plus className="size-4" />
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
                                <PackageSearch className="size-10" />
                                <span>Produk tidak ditemukan.</span>
                            </div>
                        )}
                    </section>

                    <CartPanel
                        cart={cart}
                        cartItemsCount={cartItemsCount}
                        cartTotal={cartTotal}
                        errors={errors}
                        isSubmitting={isSubmitting}
                        className="min-h-0"
                        onQtyChange={changeQty}
                        onNoteChange={changeNote}
                        onReset={resetCart}
                        onSave={() => openCheckout('save')}
                        onCheckout={() => openCheckout('pay')}
                    />
                </div>
            </div>

            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {checkoutMode === 'save'
                                ? 'Detail order'
                                : 'Pembayaran'}
                        </DialogTitle>
                        <DialogDescription>
                            {checkoutMode === 'save'
                                ? 'Lengkapi detail sebelum order disimpan.'
                                : `Total tagihan ${formatRupiah(cartTotal)}`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-3">
                            <div className="grid gap-1.5">
                                <Label htmlFor="customer_name">Pelanggan</Label>
                                <Input
                                    id="customer_name"
                                    value={customerName}
                                    onChange={(event) =>
                                        setCustomerName(event.target.value)
                                    }
                                    placeholder="Nama pelanggan (opsional)"
                                    autoComplete="off"
                                    className="h-10"
                                />
                                <InputError message={errors.customer_name} />
                            </div>

                            <div className="grid gap-1.5">
                                <Label>Tipe order</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {orderTypeOptions.map(
                                        ({ value, label, icon: Icon }) => (
                                            <Button
                                                key={value}
                                                type="button"
                                                variant={
                                                    orderType === value
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                className="h-10"
                                                onClick={() =>
                                                    setOrderType(value)
                                                }
                                            >
                                                <Icon />
                                                {label}
                                            </Button>
                                        ),
                                    )}
                                </div>
                                <InputError message={errors.order_type} />
                            </div>
                        </div>

                        <div className="grid gap-2 rounded-lg bg-muted/60 p-3">
                            <div className="flex justify-between text-sm">
                                <span>Item</span>
                                <span>{cartItemLabel(cartItemsCount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>{formatRupiah(cartTotal)}</span>
                            </div>
                            <div className="flex justify-between text-base font-semibold">
                                <span>Grand total</span>
                                <span>{formatRupiah(cartTotal)}</span>
                            </div>
                        </div>

                        {checkoutMode === 'pay' && (
                            <>
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
                                                    onClick={() =>
                                                        setPaymentMethod(value)
                                                    }
                                                >
                                                    <Icon />
                                                    {label}
                                                </Button>
                                            ),
                                        )}
                                    </div>
                                    <InputError
                                        message={errors.payment_method}
                                    />
                                </div>

                                {paymentMethod === 'cash' ? (
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
                                                    setPaidAmount(
                                                        event.target.value,
                                                    )
                                                }
                                                className={cn(
                                                    isCashPaymentIncomplete &&
                                                        'border-destructive',
                                                )}
                                            />
                                            <InputError
                                                message={errors.paid_amount}
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {suggestedCashAmounts.map(
                                                (amount) => (
                                                    <Button
                                                        key={amount}
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            setPaidAmount(
                                                                String(amount),
                                                            )
                                                        }
                                                    >
                                                        {amount === cartTotal
                                                            ? 'Uang pas'
                                                            : formatRupiah(
                                                                  amount,
                                                              )}
                                                    </Button>
                                                ),
                                            )}
                                        </div>
                                        <div className="flex justify-between rounded-md bg-background px-3 py-2 text-sm font-medium">
                                            <span>Kembalian</span>
                                            <span>
                                                {formatRupiah(changeAmount)}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                                        {paymentLabels[paymentMethod]} akan
                                        dicatat lunas saat konfirmasi.
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPaymentOpen(false)}
                            disabled={isSubmitting}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmCheckout}
                            disabled={
                                isSubmitting ||
                                cart.length === 0 ||
                                isCashPaymentIncomplete
                            }
                        >
                            {isSubmitting
                                ? 'Memproses...'
                                : checkoutMode === 'save'
                                  ? 'Simpan order'
                                  : 'Konfirmasi'}
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
                                <DialogTitle>Order tersimpan</DialogTitle>
                                <DialogDescription>
                                    Antrean {successOrder.queue_number} -{' '}
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
                                    Tutup
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
