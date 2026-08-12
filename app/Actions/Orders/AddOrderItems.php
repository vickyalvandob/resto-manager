<?php

namespace App\Actions\Orders;

use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AddOrderItems
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

            if ($freshOrder->status !== 'open') {
                throw ValidationException::withMessages([
                    'items' => __('Only open orders can be updated.'),
                ]);
            }

            /** @var array<int, array{product_id: int, qty: int, note?: string|null}> $requestedItems */
            $requestedItems = $data['items'];
            $products = $this->availableProducts($requestedItems);
            $orderItems = [];
            $addedSubtotal = 0;

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
                $addedSubtotal += $lineSubtotal;

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

            $freshOrder->items()->createMany($orderItems);

            $subtotal = (int) round((float) $freshOrder->subtotal) + $addedSubtotal;

            $freshOrder->forceFill([
                'subtotal' => $subtotal,
                'grand_total' => $subtotal,
            ])->save();

            return $freshOrder->load(['cashier:id,name,email,role', 'items']);
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
}
