<?php

namespace App\Actions\Orders;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateOrder
{
    public function __construct(private PayOrder $payOrder) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(User $cashier, array $data): Order
    {
        return DB::transaction(function () use ($cashier, $data): Order {
            /** @var array<int, array{product_id: int, qty: int, note?: string|null}> $requestedItems */
            $requestedItems = $data['items'];
            $products = $this->availableProducts($requestedItems);
            $orderItems = [];
            $subtotal = 0;

            foreach ($requestedItems as $index => $item) {
                /** @var Product|null $product */
                $product = $products->get($item['product_id']);

                if (! $product instanceof Product) {
                    throw ValidationException::withMessages([
                        "items.{$index}.product_id" => __('Produk tidak tersedia.'),
                    ]);
                }

                $qty = (int) $item['qty'];
                $price = (int) round((float) $product->price);
                $lineSubtotal = $price * $qty;
                $subtotal += $lineSubtotal;

                $orderItems[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'price' => $price,
                    'qty' => $qty,
                    'subtotal' => $lineSubtotal,
                    'note' => $item['note'] ?? null,
                ];
            }

            if ($orderItems === []) {
                throw ValidationException::withMessages([
                    'items' => __('Cart cannot be empty.'),
                ]);
            }

            $queueNumber = $this->nextQueueNumber();

            $order = Order::query()->create([
                'queue_number' => $queueNumber,
                'invoice_number' => $this->invoiceNumber($queueNumber),
                'customer_name' => $data['customer_name'] ?? null,
                'order_type' => $data['order_type'],
                'subtotal' => $subtotal,
                'grand_total' => $subtotal,
                'cashier_id' => $cashier->id,
                'status' => 'open',
            ]);

            $order->items()->createMany($orderItems);

            if (! empty($data['payment_method'])) {
                $this->payOrder->apply($order, $data);
            }

            return $order->load(['cashier:id,name,email,role', 'items']);
        });
    }

    /**
     * @param  array<int, array{product_id: int, qty: int, note?: string|null}>  $items
     * @return Collection<int, Product>
     */
    private function availableProducts(array $items): Collection
    {
        $productIds = collect($items)
            ->pluck('product_id')
            ->unique()
            ->values()
            ->all();

        return Product::query()
            ->select(['id', 'name', 'price', 'is_active', 'is_available'])
            ->available()
            ->whereIn('id', $productIds)
            ->lockForUpdate()
            ->get()
            ->keyBy('id');
    }

    private function nextQueueNumber(): int
    {
        return ((int) Order::query()
            ->whereBetween('created_at', [now()->startOfDay(), now()->endOfDay()])
            ->lockForUpdate()
            ->max('queue_number')) + 1;
    }

    private function invoiceNumber(int $queueNumber): string
    {
        return sprintf('INV-%s-%03d', now()->format('ymd'), $queueNumber);
    }
}
