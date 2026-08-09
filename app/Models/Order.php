<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $queue_number
 * @property string $invoice_number
 * @property string|null $customer_name
 * @property string $order_type
 * @property string $subtotal
 * @property string $grand_total
 * @property string|null $payment_method
 * @property string $paid_amount
 * @property string $change_amount
 * @property string $status
 * @property int $cashier_id
 * @property Carbon|null $paid_at
 * @property Carbon|null $voided_at
 * @property string|null $void_reason
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'queue_number',
    'invoice_number',
    'customer_name',
    'order_type',
    'subtotal',
    'grand_total',
    'payment_method',
    'paid_amount',
    'change_amount',
    'status',
    'cashier_id',
    'paid_at',
    'voided_at',
    'void_reason',
])]
class Order extends Model
{
    protected $attributes = [
        'payment_method' => null,
        'paid_amount' => 0,
        'change_amount' => 0,
        'status' => 'open',
    ];

    /**
     * @return BelongsTo<User, $this>
     */
    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @param  Builder<Order>  $query
     * @return Builder<Order>
     */
    public function scopePaid(Builder $query): Builder
    {
        return $query->where('status', 'paid');
    }

    public function formattedQueueNumber(): string
    {
        return str_pad((string) $this->queue_number, 3, '0', STR_PAD_LEFT);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'grand_total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'change_amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }
}
