<?php

namespace App\Http\Controllers\Orders;

use App\Actions\Orders\PayOrder;
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRequest;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class PaymentController extends Controller
{
    public function store(StorePaymentRequest $request, Order $order, PayOrder $payOrder): RedirectResponse
    {
        $paidOrder = $payOrder->handle($order, $request->validated());

        Inertia::flash([
            'toast' => ['type' => 'success', 'message' => __('Payment recorded.')],
            'order' => [
                'id' => $paidOrder->id,
                'invoice_number' => $paidOrder->invoice_number,
                'queue_number' => $paidOrder->formattedQueueNumber(),
                'status' => $paidOrder->status,
                'grand_total' => (int) round((float) $paidOrder->grand_total),
                'receipt_url' => route('orders.receipt', $paidOrder),
            ],
        ]);

        return to_route('orders.show', $paidOrder);
    }
}
