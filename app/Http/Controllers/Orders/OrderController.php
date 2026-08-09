<?php

namespace App\Http\Controllers\Orders;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'date' => (string) $request->query('date', 'today'),
            'status' => (string) $request->query('status', ''),
            'search' => trim((string) $request->query('search', '')),
        ];

        $orders = Order::query()
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
            ->with('cashier:id,name,email,role')
            ->when($filters['date'] === 'today', fn ($query) => $query->whereBetween('created_at', [now()->startOfDay(), now()->endOfDay()]))
            ->when(in_array($filters['status'], ['open', 'paid', 'void'], true), fn ($query) => $query->where('status', $filters['status']))
            ->when($filters['search'] !== '', function ($query) use ($filters): void {
                $search = $filters['search'];

                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('invoice_number', 'like', "%{$search}%")
                        ->orWhere('customer_name', 'like', "%{$search}%");

                    if (is_numeric($search)) {
                        $query->orWhere('queue_number', (int) $search);
                    }
                });
            })
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Order $order): array => $this->listPayload($order));

        return Inertia::render('orders/index', [
            'orders' => $orders,
            'filters' => $filters,
        ]);
    }

    public function show(Order $order): Response
    {
        $order->load(['cashier:id,name,email,role', 'items']);

        return Inertia::render('orders/show', [
            'order' => $this->detailPayload($order),
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
}
