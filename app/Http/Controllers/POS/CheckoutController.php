<?php

namespace App\Http\Controllers\POS;

use App\Actions\Orders\CreateOrder;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class CheckoutController extends Controller
{
    public function store(StoreOrderRequest $request, CreateOrder $createOrder): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $order = $createOrder->handle($user, $request->validated());

        Inertia::flash([
            'toast' => [
                'type' => 'success',
                'message' => $order->status === 'paid' ? __('Payment recorded.') : __('Order saved.'),
            ],
            'order' => $this->successPayload($order),
        ]);

        return to_route('pos.index');
    }

    /**
     * @return array{id: int, invoice_number: string, queue_number: string, status: string, grand_total: int, receipt_url: string}
     */
    private function successPayload(Order $order): array
    {
        return [
            'id' => $order->id,
            'invoice_number' => $order->invoice_number,
            'queue_number' => $order->formattedQueueNumber(),
            'status' => $order->status,
            'grand_total' => (int) round((float) $order->grand_total),
            'receipt_url' => route('orders.receipt', $order),
        ];
    }
}
