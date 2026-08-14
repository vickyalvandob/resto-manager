<?php

namespace App\Http\Controllers\POS;

use App\Actions\POS\GetAvailableMenu;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __invoke(GetAvailableMenu $menu): Response
    {
        return Inertia::render('pos/index', $menu->handle());
    }
}
