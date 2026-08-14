import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/currency';
import { formatDateTime } from '@/lib/date';
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
};

export default function Receipt({ order, setting }: ReceiptProps) {
    return (
        <>
            <Head title={`Receipt ${order.invoice_number}`} />

            <div className="receipt-actions flex justify-between gap-2 p-4">
                <Button variant="outline" asChild>
                    <Link href={showOrder(order.id)}>
                        <ArrowLeft />
                        Back
                    </Link>
                </Button>
                <Button type="button" onClick={() => window.print()}>
                    <Printer />
                    Print
                </Button>
            </div>

            <main className="receipt-print mx-auto my-4 w-[58mm] bg-white p-4 text-[11px] leading-tight text-black shadow-sm">
                <header className="text-center">
                    {setting.logo_url && (
                        <img
                            src={setting.logo_url}
                            alt={`${setting.store_name} logo`}
                            className="mx-auto mb-2 h-12 max-w-24 object-contain"
                        />
                    )}
                    <h1 className="text-sm font-bold uppercase">
                        {setting.store_name}
                    </h1>
                    {setting.address && <p>{setting.address}</p>}
                    {setting.phone && <p>{setting.phone}</p>}
                </header>

                <div className="my-3 border-t border-b border-dashed border-black py-2">
                    <div className="flex justify-between">
                        <span>Invoice</span>
                        <span>{order.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Queue</span>
                        <span>{order.queue_number}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Date</span>
                        <span>{formatDateTime(order.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Cashier</span>
                        <span>{order.cashier.name}</span>
                    </div>
                </div>

                <section className="grid gap-2">
                    {order.items.map((item, index) => (
                        <div key={`${item.product_name}-${index}`}>
                            <div className="font-medium">
                                {item.qty} x {item.product_name}
                            </div>
                            <div className="flex justify-between">
                                <span>{formatRupiah(item.price)}</span>
                                <span>{formatRupiah(item.subtotal)}</span>
                            </div>
                            {item.note && <div>Note: {item.note}</div>}
                        </div>
                    ))}
                </section>

                <div className="my-3 border-t border-dashed border-black pt-2">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatRupiah(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>{formatRupiah(order.grand_total)}</span>
                    </div>
                </div>

                <div className="border-t border-dashed border-black pt-2">
                    <div className="flex justify-between">
                        <span>Payment</span>
                        <span>{order.payment_method ?? '-'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Paid</span>
                        <span>{formatRupiah(order.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Change</span>
                        <span>{formatRupiah(order.change_amount)}</span>
                    </div>
                    {order.status !== 'paid' && (
                        <div className="mt-2 text-center font-bold">
                            {order.status.toUpperCase()}
                        </div>
                    )}
                </div>

                {setting.receipt_footer && (
                    <footer className="mt-4 text-center">
                        {setting.receipt_footer}
                    </footer>
                )}
            </main>
        </>
    );
}
