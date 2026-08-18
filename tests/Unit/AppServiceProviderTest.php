<?php

use App\Providers\AppServiceProvider;
use Illuminate\Database\Console\Migrations\FreshCommand;
use Illuminate\Database\Console\Migrations\RefreshCommand;
use Illuminate\Database\Console\Migrations\ResetCommand;
use Illuminate\Database\Console\Migrations\RollbackCommand;
use Illuminate\Database\Console\WipeCommand;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

uses(TestCase::class);

afterEach(function () {
    DB::prohibitDestructiveCommands(false);
});

test('production boot does not prohibit destructive database commands', function () {
    DB::prohibitDestructiveCommands(false);

    $this->app['env'] = 'production';

    (new AppServiceProvider($this->app))->boot();

    foreach (destructiveDatabaseCommandClasses() as $commandClass) {
        expect(commandIsProhibited($commandClass))->toBeFalse();
    }
});

/**
 * @return array<int, class-string>
 */
function destructiveDatabaseCommandClasses(): array
{
    return [
        FreshCommand::class,
        RefreshCommand::class,
        ResetCommand::class,
        RollbackCommand::class,
        WipeCommand::class,
    ];
}

/**
 * @param  class-string  $commandClass
 */
function commandIsProhibited(string $commandClass): bool
{
    return (bool) (new ReflectionClass($commandClass))->getStaticPropertyValue('prohibitedFromRunning');
}
