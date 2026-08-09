<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['store_name', 'address', 'phone', 'receipt_footer', 'logo'])]
class Setting extends Model
{
    protected $attributes = [
        'store_name' => 'Resto Manager',
    ];

    public static function current(): self
    {
        return self::query()->firstOrCreate([], [
            'store_name' => config('app.name', 'Resto Manager'),
        ]);
    }
}
