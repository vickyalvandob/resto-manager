<?php

namespace App\Http\Controllers\POS;

use App\Actions\POS\GetAvailableMenu;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __invoke(GetAvailableMenu $menu): Response
    {
        return Inertia::render('pos/index', [
            ...$menu->handle(),
            'openOrdersCount' => Order::query()
                ->where('status', 'open')
                ->whereBetween('created_at', [now()->startOfDay(), now()->endOfDay()])
                ->count(),
        ]);
    }
}
