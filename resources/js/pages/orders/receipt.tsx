import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/currency';
import { formatDateTime } from '@/lib/date';
import { cn } from '@/lib/utils';
import { show as showOrder } from '@/routes/orders';

type ReceiptOrder = {
    id: number;
    invoice_number: string;
    queue_number: string;
    customer_name: string | null;
    order_type: 'dine_in' | 'take_away';
    payment_method: 'cash' | 'qris' | 'transfer' | null;
    subtotal: number;
    grand_total: number;
    paid_amount: number;
    change_amount: number;
    status: 'open' | 'paid' | 'void';
    created_at: string | null;
    paid_at: string | null;
    cashier: {
        name: string;
    };
    items: {
        product_name: string;
        price: number;
        qty: number;
        subtotal: number;
        note: string | null;
    }[];
};

type ReceiptSetting = {
    store_name: string;
    address: string | null;
    phone: string | null;
    receipt_footer: string | null;
    logo_url: string | null;
};

type ReceiptProps = {
    order: ReceiptOrder;
    setting: ReceiptSetting;
    thermal_print_url: string;
};

const orderTypeLabels = {
    dine_in: 'Dine In',
    take_away: 'Take Away',
} satisfies Record<ReceiptOrder['order_type'], string>;

const paymentMethodLabels = {
    cash: 'Tunai',
    qris: 'QRIS',
    transfer: 'Transfer',
} satisfies Record<NonNullable<ReceiptOrder['payment_method']>, string>;

export default function Receipt({
    order,
    setting,
    thermal_print_url,
}: ReceiptProps) {
    const bluetoothPrintUrl = `my.bluetoothprint.scheme://${thermal_print_url}`;

    return (
        <>
            <Head title={`Struk ${order.invoice_number}`} />

            <div className="min-h-screen bg-muted/40 px-3 py-4 print:min-h-0 print:bg-white print:p-0">
                <div className="receipt-actions mx-auto mb-3 flex w-[58mm] max-w-full gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="min-w-0 flex-1"
                        asChild
                    >
                        <Link href={showOrder(order.id)}>
                            <ArrowLeft />
                            Kembali
                        </Link>
                    </Button>
                    <Button size="sm" className="min-w-0 flex-1" asChild>
                        <a href={bluetoothPrintUrl}>
                            <Printer />
                            Cetak 58mm
                        </a>
                    </Button>
                </div>

                <main className="receipt-print mx-auto w-[58mm] max-w-[58mm] bg-white px-[4.5mm] py-[3.5mm] text-[11px] leading-[1.26] text-black shadow-sm print:shadow-none">
                    <header className="space-y-0.5 text-center">
                        {setting.logo_url && (
                            <img
                                src={setting.logo_url}
                                alt={`${setting.store_name} logo`}
                                className="mx-auto mb-1.5 max-h-[13mm] max-w-[25mm] object-contain"
                            />
                        )}
                        <h1 className="text-[13px] leading-tight font-bold break-words uppercase">
                            {setting.store_name}
                        </h1>
                        {setting.address && (
                            <p className="break-words">{setting.address}</p>
                        )}
                        {setting.phone && (
                            <p className="break-words">{setting.phone}</p>
                        )}
                    </header>

                    <ReceiptDivider />

                    <section
                        aria-label="Informasi pesanan"
                        className="space-y-[1mm]"
                    >
                        <ReceiptLine
                            label="Invoice"
                            value={order.invoice_number}
                        />
                        <ReceiptLine
                            label="Antrian"
                            value={order.queue_number}
                        />
                        <ReceiptLine
                            label="Tanggal"
                            value={formatDateTime(order.created_at)}
                        />
                        <ReceiptLine
                            label="Layanan"
                            value={orderTypeLabels[order.order_type]}
                        />
                        {order.customer_name && (
                            <ReceiptLine
                                label="Pelanggan"
                                value={order.customer_name}
                            />
                        )}
                        <ReceiptLine label="Kasir" value={order.cashier.name} />
                    </section>

                    <ReceiptDivider />

                    <section
                        aria-label="Item pesanan"
                        className="space-y-[1.8mm]"
                    >
                        {order.items.map((item, index) => (
                            <article
                                key={`${item.product_name}-${index}`}
                                className="break-inside-avoid"
                            >
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-[2mm] font-semibold">
                                    <span className="min-w-0 break-words">
                                        {item.product_name}
                                    </span>
                                    <span className="shrink-0 tabular-nums">
                                        x{item.qty}
                                    </span>
                                </div>
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-[2mm] text-[10.5px] tabular-nums">
                                    <span className="min-w-0 break-words">
                                        {item.qty} x {formatRupiah(item.price)}
                                    </span>
                                    <span className="text-right font-medium">
                                        {formatRupiah(item.subtotal)}
                                    </span>
                                </div>
                                {item.note && (
                                    <p className="mt-[0.5mm] text-[10px] leading-tight break-words">
                                        Catatan: {item.note}
                                    </p>
                                )}
                            </article>
                        ))}
                    </section>

                    <ReceiptDivider />

                    <section aria-label="Ringkasan pembayaran">
                        <ReceiptLine
                            label="Subtotal"
                            value={formatRupiah(order.subtotal)}
                        />
                        <ReceiptLine
                            label="Total"
                            value={formatRupiah(order.grand_total)}
                            emphasis
                            strong
                        />
                    </section>

                    <ReceiptDivider />

                    <section aria-label="Pembayaran" className="space-y-0.5">
                        <ReceiptLine
                            label="Metode"
                            value={
                                order.payment_method
                                    ? paymentMethodLabels[order.payment_method]
                                    : '-'
                            }
                        />
                        <ReceiptLine
                            label="Dibayar"
                            value={formatRupiah(order.paid_amount)}
                        />
                        <ReceiptLine
                            label="Kembali"
                            value={formatRupiah(order.change_amount)}
                        />
                        {order.status !== 'paid' && (
                            <div className="pt-1 text-center text-[11px] font-bold tracking-normal">
                                {order.status.toUpperCase()}
                            </div>
                        )}
                    </section>

                    {setting.receipt_footer && (
                        <>
                            <ReceiptDivider />
                            <footer className="text-center text-[10.5px] leading-snug break-words whitespace-pre-line">
                                {setting.receipt_footer}
                            </footer>
                        </>
                    )}

                    <div className="mt-2 text-center text-[10px] leading-none">
                        ***
                    </div>
                </main>
            </div>
        </>
    );
}

function ReceiptDivider() {
    return <div className="my-[2mm] border-t border-black" />;
}

function ReceiptLine({
    label,
    value,
    emphasis = false,
    strong = false,
}: {
    label: string;
    value: ReactNode;
    emphasis?: boolean;
    strong?: boolean;
}) {
    return (
        <div
            className={cn(
                'grid grid-cols-[16mm_minmax(0,1fr)] items-start gap-x-[1.5mm]',
                emphasis && 'pt-[1mm] text-[12.5px] leading-tight',
                strong && 'font-bold',
            )}
        >
            <span className="shrink-0">{label}</span>
            <span className="min-w-0 text-right break-words tabular-nums">
                {value}
            </span>
        </div>
    );
}
