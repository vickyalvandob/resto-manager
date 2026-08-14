<?php

namespace App\Actions\Orders;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateOrder
{
    private const QUEUE_LOCK_SECONDS = 10;

    private const QUEUE_LOCK_WAIT_SECONDS = 5;

    private const TRANSACTION_ATTEMPTS = 3;

    public function __construct(private PayOrder $payOrder) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function handle(User $cashier, array $data): Order
    {
        $orderedAt = CarbonImmutable::instance(now());

        try {
            /** @var Order $order */
            $order = Cache::lock($this->queueLockKey($orderedAt), self::QUEUE_LOCK_SECONDS)
                ->block(self::QUEUE_LOCK_WAIT_SECONDS, fn (): Order => DB::transaction(
                    fn (): Order => $this->createLocked($cashier, $data, $orderedAt),
                    attempts: self::TRANSACTION_ATTEMPTS,
                ));

            return $order;
        } catch (LockTimeoutException) {
            throw ValidationException::withMessages([
                'items' => __('Checkout sedang ramai. Coba lagi.'),
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function createLocked(User $cashier, array $data, CarbonImmutable $orderedAt): Order
    {
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

        $queueNumber = $this->nextQueueNumber($orderedAt);

        $order = Order::query()->create([
            'queue_number' => $queueNumber,
            'invoice_number' => $this->invoiceNumber($queueNumber, $orderedAt),
            'customer_name' => $data['customer_name'] ?? null,
            'order_type' => $data['order_type'],
            'subtotal' => $subtotal,
            'grand_total' => $subtotal,
            'cashier_id' => $cashier->id,
            'status' => 'open',
            'created_at' => $orderedAt,
            'updated_at' => $orderedAt,
        ]);

        $order->items()->createMany($orderItems);

        if (! empty($data['payment_method'])) {
            $this->payOrder->apply($order, $data);
        }

        return $order->load(['cashier:id,name,email,role', 'items']);
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

    private function nextQueueNumber(CarbonImmutable $orderedAt): int
    {
        return ((int) Order::query()
            ->whereBetween('created_at', [$orderedAt->startOfDay(), $orderedAt->endOfDay()])
            ->lockForUpdate()
            ->max('queue_number')) + 1;
    }

    private function invoiceNumber(int $queueNumber, CarbonImmutable $orderedAt): string
    {
        return sprintf('INV-%s-%03d', $orderedAt->format('ymd'), $queueNumber);
    }

    private function queueLockKey(CarbonImmutable $orderedAt): string
    {
        return 'orders:queue-number:'.$orderedAt->toDateString();
    }
}
