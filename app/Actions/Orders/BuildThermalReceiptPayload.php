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
        $this->pushBlank($payload);
        $this->pushWrappedText($payload, 'STRUK PEMBAYARAN', bold: 1, align: 1);
        $this->pushWrappedText($payload, 'ANTRIAN '.$order->formattedQueueNumber(), bold: 1, align: 1, format: 1);
        $this->pushDivider($payload);

        $this->pushColumns($payload, 'Invoice', $order->invoice_number);
        $this->pushColumns($payload, 'Waktu', $order->paid_at?->format('d/m/Y H:i') ?? $order->created_at?->format('d/m/Y H:i') ?? '-');
        $this->pushColumns($payload, 'Layanan', $this->orderTypeLabel($order->order_type));
        $this->pushColumns($payload, 'Pelanggan', $order->customer_name ?: '-');
        $this->pushColumns($payload, 'Kasir', $order->cashier->name);
        $this->pushDivider($payload);

        foreach ($order->items as $item) {
            $this->pushWrappedText($payload, $item->product_name, bold: 1);
            $this->pushColumns(
                $payload,
                "  {$item->qty} x ".$this->formatRupiah((int) round((float) $item->price)),
                $this->formatRupiah((int) round((float) $item->subtotal)),
            );
            $this->pushWrappedText($payload, $item->note ? '  Catatan: '.$item->note : null);
        }

        $this->pushDivider($payload, '=');
        $this->pushColumns($payload, 'Subtotal', $this->formatRupiah((int) round((float) $order->subtotal)));
        $this->pushColumns($payload, 'TOTAL', $this->formatRupiah((int) round((float) $order->grand_total)), bold: 1, format: 1);
        $this->pushDivider($payload, '=');

        $this->pushColumns($payload, 'Metode', $this->paymentMethodLabel($order->payment_method));
        $this->pushColumns($payload, 'Dibayar', $this->formatRupiah((int) round((float) $order->paid_amount)));
        $this->pushColumns($payload, 'Kembali', $this->formatRupiah((int) round((float) $order->change_amount)));

        $this->pushWrappedText($payload, $this->statusLabel($order->status), bold: 1, align: 1);

        $this->pushBlank($payload);
        $this->pushWrappedText($payload, $setting->receipt_footer, align: 1);
        $this->pushWrappedText($payload, '***', align: 1);
        $this->pushBlank($payload);
        $this->pushBlank($payload);

        return $payload;
    }

    /**
     * @param  array<int, array{type: int, content: string, bold: int, align: int, format: int}>  $payload
     */
    private function pushColumns(array &$payload, string $left, string $right, int $bold = 0, int $format = 0): void
    {
        $left = $this->inline($left);
        $right = $this->inline($right);

        if ($right === '') {
            $this->pushWrappedText($payload, $left, bold: $bold, format: $format);

            return;
        }

        $space = self::LINE_WIDTH - Str::length($left) - Str::length($right);

        if ($space >= 1) {
            $this->pushText($payload, $left.str_repeat(' ', $space).$right, bold: $bold, format: $format);

            return;
        }

        $this->pushWrappedText($payload, $left, bold: $bold, format: $format);
        $this->pushWrappedText($payload, $right, bold: $bold, align: 2, format: $format);
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
        foreach ($this->wrappedLines($content) as $line) {
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
    private function pushDivider(array &$payload, string $character = '-'): void
    {
        $this->pushText($payload, str_repeat(Str::substr($character, 0, 1), self::LINE_WIDTH));
    }

    /**
     * @param  array<int, array{type: int, content: string, bold: int, align: int, format: int}>  $payload
     */
    private function pushBlank(array &$payload): void
    {
        $this->pushText($payload, ' ');
    }

    /**
     * @return array<int, string>
     */
    private function wrappedLines(?string $value): array
    {
        $value = preg_replace('/<br\s*\/?>/i', "\n", (string) $value) ?? '';
        $value = strip_tags($value);
        $value = str_replace("\r", "\n", $value);

        return collect(explode("\n", $value))
            ->map(fn (string $line): string => Str::of($line)->replace("\t", ' ')->squish()->toString())
            ->filter(fn (string $line): bool => $line !== '')
            ->flatMap(fn (string $line): array => explode(
                "\n",
                Str::wordWrap($line, characters: self::LINE_WIDTH, break: "\n", cutLongWords: true),
            ))
            ->values()
            ->all();
    }

    private function inline(?string $value): string
    {
        return implode(' ', $this->wrappedLines($value));
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

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'paid' => 'LUNAS',
            'open' => 'BELUM DIBAYAR',
            'void' => 'DIBATALKAN',
            default => Str::upper($status),
        };
    }
}
