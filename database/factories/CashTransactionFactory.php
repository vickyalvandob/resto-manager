<?php

namespace Database\Factories;

use App\Models\CashTransaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CashTransaction>
 */
class CashTransactionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'transaction_date' => fake()->dateTimeBetween('-1 month')->format('Y-m-d'),
            'type' => CashTransaction::TYPE_EXPENSE,
            'category' => fake()->randomElement(CashTransaction::categoriesForType(CashTransaction::TYPE_EXPENSE)),
            'payment_method' => fake()->randomElement(CashTransaction::PAYMENT_METHODS),
            'amount' => fake()->numberBetween(5_000, 250_000),
            'description' => fake()->optional()->sentence(),
        ];
    }

    public function income(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => CashTransaction::TYPE_INCOME,
            'category' => fake()->randomElement(CashTransaction::categoriesForType(CashTransaction::TYPE_INCOME)),
        ]);
    }

    public function expense(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => CashTransaction::TYPE_EXPENSE,
            'category' => fake()->randomElement(CashTransaction::categoriesForType(CashTransaction::TYPE_EXPENSE)),
        ]);
    }
}
