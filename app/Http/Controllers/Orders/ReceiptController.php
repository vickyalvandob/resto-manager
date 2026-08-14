<?php

namespace App\Http\Controllers\Orders;

use App\Actions\Orders\BuildThermalReceiptPayload;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;

class ReceiptController extends Controller
{
    public function show(Order $order): Response
    {
        $order->load(['cashier:id,name,email,role', 'items']);
        $setting = Setting::current();

        return Inertia::render('orders/receipt', [
            'order' => [
                'id' => $order->id,
                'invoice_number' => $order->invoice_number,
                'queue_number' => $order->formattedQueueNumber(),
                'customer_name' => $order->customer_name,
                'order_type' => $order->order_type,
                'payment_method' => $order->payment_method,
                'subtotal' => (int) round((float) $order->subtotal),
                'grand_total' => (int) round((float) $order->grand_total),
                'paid_amount' => (int) round((float) $order->paid_amount),
                'change_amount' => (int) round((float) $order->change_amount),
                'status' => $order->status,
                'created_at' => $order->created_at?->toISOString(),
                'paid_at' => $order->paid_at?->toISOString(),
                'cashier' => ['name' => $order->cashier->name],
                'items' => $order->items->map(fn ($item): array => [
                    'product_name' => $item->product_name,
                    'price' => (int) round((float) $item->price),
                    'qty' => $item->qty,
                    'subtotal' => (int) round((float) $item->subtotal),
                    'note' => $item->note,
                ])->all(),
            ],
            'setting' => [
                'store_name' => $setting->store_name,
                'address' => $setting->address,
                'phone' => $setting->phone,
                'receipt_footer' => $setting->receipt_footer,
                'logo_url' => $setting->logo ? Storage::url($setting->logo) : null,
            ],
            'thermal_print_url' => URL::temporarySignedRoute(
                'orders.receipt.thermal',
                now()->addMinutes(10),
                ['order' => $order],
            ),
        ]);
    }

    public function thermal(Order $order, BuildThermalReceiptPayload $payload): JsonResponse
    {
        $order->loadMissing(['cashier:id,name', 'items']);

        return response()->json(
            $payload->handle($order, Setting::current()),
            200,
            [],
            JSON_FORCE_OBJECT,
        );
    }
}
