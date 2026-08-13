<?php

namespace App\Http\Controllers\Orders;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    private const DATE_FILTERS = ['today', 'yesterday', 'all'];

    private const STATUS_FILTERS = ['open', 'paid', 'void'];

    public function index(Request $request): Response
    {
        $filters = $this->filters($request);
        $baseQuery = $this->filteredOrdersQuery($filters);
        $summary = $this->summaryPayload(clone $baseQuery);

        $orders = (clone $baseQuery)
            ->select([
                'id',
                'queue_number',
                'invoice_number',
                'customer_name',
                'order_type',
                'payment_method',
                'grand_total',
                'status',
                'cashier_id',
                'created_at',
            ])
            ->with('cashier:id,name')
            ->when($filters['status'] !== '', fn (Builder $query) => $query->where('status', $filters['status']))
            ->latest('created_at')
            ->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Order $order): array => $this->listPayload($order));

        return Inertia::render('orders/index', [
            'orders' => $orders,
            'filters' => $filters,
            'summary' => $summary,
        ]);
    }

    public function show(Order $order): Response
    {
        $order->load(['cashier:id,name,email,role', 'items']);

        return Inertia::render('orders/show', [
            'order' => $this->detailPayload($order),
            'products' => $order->status === 'open' ? $this->availableProductsPayload() : [],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function listPayload(Order $order): array
    {
        return [
            'id' => $order->id,
            'queue_number' => $order->formattedQueueNumber(),
            'invoice_number' => $order->invoice_number,
            'customer_name' => $order->customer_name,
            'order_type' => $order->order_type,
            'payment_method' => $order->payment_method,
            'grand_total' => (int) round((float) $order->grand_total),
            'status' => $order->status,
            'created_at' => $order->created_at?->toISOString(),
            'cashier' => [
                'id' => $order->cashier->id,
                'name' => $order->cashier->name,
            ],
        ];
    }

    /**
     * @return array{date: string, status: string, search: string}
     */
    private function filters(Request $request): array
    {
        $date = (string) $request->query('date', 'today');
        $status = (string) $request->query('status', '');

        if (! in_array($date, self::DATE_FILTERS, true)) {
            $date = 'today';
        }

        if (! in_array($status, self::STATUS_FILTERS, true)) {
            $status = '';
        }

        return [
            'date' => $date,
            'status' => $status,
            'search' => trim((string) $request->query('search', '')),
        ];
    }

    /**
     * @param  array{date: string, status: string, search: string}  $filters
     * @return Builder<Order>
     */
    private function filteredOrdersQuery(array $filters): Builder
    {
        return Order::query()
            ->when($filters['date'] !== 'all', function (Builder $query) use ($filters): void {
                $day = $filters['date'] === 'yesterday' ? now()->subDay() : now();

                $query->whereBetween('created_at', [
                    $day->copy()->startOfDay(),
                    $day->copy()->endOfDay(),
                ]);
            })
            ->when($filters['search'] !== '', function (Builder $query) use ($filters): void {
                $search = $filters['search'];

                $query->where(function (Builder $query) use ($search): void {
                    $query
                        ->where('invoice_number', 'like', "%{$search}%")
                        ->orWhere('customer_name', 'like', "%{$search}%");

                    if (is_numeric($search)) {
                        $query->orWhere('queue_number', (int) $search);
                    }
                });
            });
    }

    /**
     * @param  Builder<Order>  $query
     * @return array{total_orders: int, open_orders: int, paid_orders: int, void_orders: int, paid_revenue: int}
     */
    private function summaryPayload(Builder $query): array
    {
        $summary = $query
            ->toBase()
            ->selectRaw('count(*) as total_orders')
            ->selectRaw('count(case when status = ? then 1 end) as open_orders', ['open'])
            ->selectRaw('count(case when status = ? then 1 end) as paid_orders', ['paid'])
            ->selectRaw('count(case when status = ? then 1 end) as void_orders', ['void'])
            ->selectRaw('coalesce(sum(case when status = ? then grand_total else 0 end), 0) as paid_revenue', ['paid'])
            ->first();

        return [
            'total_orders' => (int) $summary->total_orders,
            'open_orders' => (int) $summary->open_orders,
            'paid_orders' => (int) $summary->paid_orders,
            'void_orders' => (int) $summary->void_orders,
            'paid_revenue' => (int) round((float) $summary->paid_revenue),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detailPayload(Order $order): array
    {
        return [
            ...$this->listPayload($order),
            'subtotal' => (int) round((float) $order->subtotal),
            'paid_amount' => (int) round((float) $order->paid_amount),
            'change_amount' => (int) round((float) $order->change_amount),
            'paid_at' => $order->paid_at?->toISOString(),
            'voided_at' => $order->voided_at?->toISOString(),
            'void_reason' => $order->void_reason,
            'receipt_url' => route('orders.receipt', $order),
            'items' => $order->items->map(fn ($item): array => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'price' => (int) round((float) $item->price),
                'qty' => $item->qty,
                'subtotal' => (int) round((float) $item->subtotal),
                'note' => $item->note,
            ])->all(),
        ];
    }

    /**
     * @return array<int, array{id: int, category_id: int, name: string, price: int, image_url: string|null, sort_order: int, category: array{id: int, name: string}}>
     */
    private function availableProductsPayload(): array
    {
        return Product::query()
            ->select(['id', 'category_id', 'name', 'price', 'image', 'is_available', 'sort_order'])
            ->with('category:id,name,sort_order')
            ->available()
            ->ordered()
            ->get()
            ->map(fn (Product $product): array => [
                'id' => $product->id,
                'category_id' => $product->category_id,
                'name' => $product->name,
                'price' => (int) round((float) $product->price),
                'image_url' => $product->image ? Storage::url($product->image) : null,
                'sort_order' => $product->sort_order,
                'category' => [
                    'id' => $product->category->id,
                    'name' => $product->category->name,
                ],
            ])
            ->all();
    }
}
