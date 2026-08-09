<?php

namespace App\Actions\Orders;

use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PayOrder
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(Order $order, array $data): Order
    {
        return DB::transaction(function () use ($order, $data): Order {
            $freshOrder = Order::query()
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->apply($freshOrder, $data);

            return $freshOrder->load(['cashier:id,name,email,role', 'items']);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function apply(Order $order, array $data): void
    {
        if ($order->status !== 'open') {
            throw ValidationException::withMessages([
                'payment_method' => __('Only open orders can be paid.'),
            ]);
        }

        $paymentMethod = (string) $data['payment_method'];
        [$paidAmount, $changeAmount] = $this->paymentAmounts($order, $paymentMethod, $data);

        $order->forceFill([
            'payment_method' => $paymentMethod,
            'paid_amount' => $paidAmount,
            'change_amount' => $changeAmount,
            'status' => 'paid',
            'paid_at' => now(),
        ])->save();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{0: int, 1: int}
     */
    private function paymentAmounts(Order $order, string $paymentMethod, array $data): array
    {
        $grandTotal = (int) round((float) $order->grand_total);

        if ($paymentMethod !== 'cash') {
            return [$grandTotal, 0];
        }

        $paidAmount = (int) round((float) ($data['paid_amount'] ?? 0));

        if ($paidAmount < $grandTotal) {
            throw ValidationException::withMessages([
                'paid_amount' => __('Paid amount must be at least the grand total.'),
            ]);
        }

        return [$paidAmount, $paidAmount - $grandTotal];
    }
}
