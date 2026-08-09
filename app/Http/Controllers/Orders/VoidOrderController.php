<?php

namespace App\Http\Controllers\Orders;

use App\Http\Controllers\Controller;
use App\Http\Requests\VoidOrderRequest;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class VoidOrderController extends Controller
{
    public function store(VoidOrderRequest $request, Order $order): RedirectResponse
    {
        $voidedOrder = DB::transaction(function () use ($request, $order): Order {
            $freshOrder = Order::query()
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($freshOrder->status !== 'open') {
                throw ValidationException::withMessages([
                    'void_reason' => __('Only open orders can be voided.'),
                ]);
            }

            $freshOrder->update([
                'status' => 'void',
                'void_reason' => $request->validated('void_reason'),
                'voided_at' => now(),
            ]);

            return $freshOrder;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Order voided.')]);

        return to_route('orders.show', $voidedOrder);
    }
}
