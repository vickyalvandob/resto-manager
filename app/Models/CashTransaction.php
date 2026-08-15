<?php

namespace App\Models;

use Database\Factories\CashTransactionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property Carbon $transaction_date
 * @property string $type
 * @property string $category
 * @property string $payment_method
 * @property int $amount
 * @property string|null $description
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['user_id', 'transaction_date', 'type', 'category', 'payment_method', 'amount', 'description'])]
class CashTransaction extends Model
{
    /** @use HasFactory<CashTransactionFactory> */
    use HasFactory;

    public const TYPE_INCOME = 'income';

    public const TYPE_EXPENSE = 'expense';

    public const TYPES = [
        self::TYPE_INCOME,
        self::TYPE_EXPENSE,
    ];

    public const PAYMENT_METHODS = [
        'cash',
        'qris',
        'transfer',
    ];

    private const INCOME_CATEGORIES = [
        'Penjualan Manual',
        'Penjualan Online',
        'Tambahan Modal',
        'Refund',
        'Lainnya',
    ];

    private const EXPENSE_CATEGORIES = [
        'Belanja Bahan',
        'Operasional',
        'Gaji',
        'Sewa',
        'Listrik & Air',
        'Peralatan',
        'Transport',
        'Lainnya',
    ];

    protected $attributes = [
        'payment_method' => 'cash',
    ];

    /**
     * @return array{income: array<int, string>, expense: array<int, string>}
     */
    public static function categories(): array
    {
        return [
            self::TYPE_INCOME => self::INCOME_CATEGORIES,
            self::TYPE_EXPENSE => self::EXPENSE_CATEGORIES,
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function categoriesForType(string $type): array
    {
        return self::categories()[$type] ?? [];
    }

    /**
     * @param  Builder<CashTransaction>  $query
     * @return Builder<CashTransaction>
     */
    public function scopeIncome(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_INCOME);
    }

    /**
     * @param  Builder<CashTransaction>  $query
     * @return Builder<CashTransaction>
     */
    public function scopeExpense(Builder $query): Builder
    {
        return $query->where('type', self::TYPE_EXPENSE);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'transaction_date' => 'date',
            'amount' => 'integer',
        ];
    }
}
