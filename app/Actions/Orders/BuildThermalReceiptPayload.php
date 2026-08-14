<?php

namespace App\Actions\Orders;

use App\Models\Order;
use App\Models\Setting;
use Illuminate\Support\Str;

class BuildThermalReceiptPayload
{
    private const LINE_WIDTH = 32;

    /**
     * @return array<int, array{type: int, content: string, bold: int, align: int, format: int}>
     */
    public function handle(Order $order, Setting $setting): array
    {
        $payload = [];

        $this->pushWrappedText($payload, $setting->store_name, bold: 1, align: 1, format: 1);
        $this->pushWrappedText($payload, $setting->address, align: 1);
        $this->pushWrappedText($payload, $setting->phone, align: 1);
        $this->pushDivider($payload);

        $this->pushColumns($payload, 'Invoice', $order->invoice_number);
        $this->pushColumns($payload, 'Antrian', $order->formattedQueueNumber());
        $this->pushColumns($payload, 'Tanggal', $order->created_at?->format('d/m/Y H:i') ?? '-');
        $this->pushColumns($payload, 'Layanan', $this->orderTypeLabel($order->order_type));
        $this->pushColumns($payload, 'Pelanggan', $order->customer_name ?: '-');
        $this->pushColumns($payload, 'Kasir', $order->cashier->name);
        $this->pushDivider($payload);

        foreach ($order->items as $item) {
            $this->pushWrappedText($payload, $item->product_name, bold: 1);
            $this->pushColumns(
                $payload,
                "{$item->qty} x ".$this->formatRupiah((int) round((float) $item->price)),
                $this->formatRupiah((int) round((float) $item->subtotal)),
            );
            $this->pushWrappedText($payload, $item->note ? 'Catatan: '.$item->note : null);
        }

        $this->pushDivider($payload);
        $this->pushColumns($payload, 'Subtotal', $this->formatRupiah((int) round((float) $order->subtotal)));
        $this->pushColumns($payload, 'TOTAL', $this->formatRupiah((int) round((float) $order->grand_total)), bold: 1);
        $this->pushDivider($payload);

        $this->pushColumns($payload, 'Metode', $this->paymentMethodLabel($order->payment_method));
        $this->pushColumns($payload, 'Dibayar', $this->formatRupiah((int) round((float) $order->paid_amount)));
        $this->pushColumns($payload, 'Kembali', $this->formatRupiah((int) round((float) $order->change_amount)));

        if ($order->status !== 'paid') {
            $this->pushWrappedText($payload, Str::upper($order->status), bold: 1, align: 1);
        }

        $this->pushWrappedText($payload, $setting->receipt_footer, align: 1);
        $this->pushWrappedText($payload, '***', align: 1);
        $this->pushBlank($payload);

        return $payload;
    }

    /**
     * @param  array<int, array{type: int, content: string, bold: int, align: int, format: int}>  $payload
     */
    private function pushColumns(array &$payload, string $left, string $right, int $bold = 0): void
    {
        $left = $this->clean($left);
        $right = $this->clean($right);

        if ($right === '') {
            $this->pushWrappedText($payload, $left, bold: $bold);

            return;
        }

        $space = self::LINE_WIDTH - Str::length($left) - Str::length($right);

        if ($space >= 1) {
            $this->pushText($payload, $left.str_repeat(' ', $space).$right, bold: $bold);

            return;
        }

        $this->pushWrappedText($payload, $left, bold: $bold);
        $this->pushWrappedText($payload, $right, bold: $bold, align: 2);
    }

    /**
     * @param  array<int, array{type: int, content: string, bold: int, align: int, format: int}>  $payload
     */
    private function pushWrappedText(
        array &$payload,
        ?string $content,
        int $bold = 0,
        int $align = 0,
        int $format = 0,
    ): void {
        $content = $this->clean($content);

        if ($content === '') {
            return;
        }

        foreach (explode("\n", wordwrap($content, self::LINE_WIDTH, "\n", true)) as $line) {
            $this->pushText($payload, $line, $bold, $align, $format);
        }
    }

    /**
     * @param  array<int, array{type: int, content: string, bold: int, align: int, format: int}>  $payload
     */
    private function pushText(array &$payload, string $content, int $bold = 0, int $align = 0, int $format = 0): void
    {
        $payload[] = [
            'type' => 0,
            'content' => $content,
            'bold' => $bold,
            'align' => $align,
            'format' => $format,
        ];
    }

    /**
     * @param  array<int, array{type: int, content: string, bold: int, align: int, format: int}>  $payload
     */
    private function pushDivider(array &$payload): void
    {
        $this->pushText($payload, str_repeat('-', self::LINE_WIDTH));
    }

    /**
     * @param  array<int, array{type: int, content: string, bold: int, align: int, format: int}>  $payload
     */
    private function pushBlank(array &$payload): void
    {
        $this->pushText($payload, ' ');
    }

    private function clean(?string $value): string
    {
        return Str::of(strip_tags((string) $value))
            ->replace(["\r", "\n", "\t"], ' ')
            ->squish()
            ->toString();
    }

    private function formatRupiah(int $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }

    private function orderTypeLabel(string $orderType): string
    {
        return match ($orderType) {
            'dine_in' => 'Dine In',
            'take_away' => 'Take Away',
            default => Str::headline($orderType),
        };
    }

    private function paymentMethodLabel(?string $paymentMethod): string
    {
        return match ($paymentMethod) {
            'cash' => 'Tunai',
            'qris' => 'QRIS',
            'transfer' => 'Transfer',
            default => '-',
        };
    }
}
