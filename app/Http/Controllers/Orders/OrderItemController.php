<?php

namespace App\Http\Controllers\Orders;

use App\Actions\Orders\AddOrderItems;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderItemsRequest;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class OrderItemController extends Controller
{
    public function store(StoreOrderItemsRequest $request, Order $order, AddOrderItems $addOrderItems): RedirectResponse
    {
        $updatedOrder = $addOrderItems->handle($order, $request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Pesanan ditambahkan.')]);

        return to_route('orders.show', $updatedOrder);
    }
}
