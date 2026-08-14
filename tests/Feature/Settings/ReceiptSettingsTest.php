<?php

use App\Models\Order;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('settings index redirects to profile settings', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->get(route('settings.index'))
        ->assertRedirect(route('profile.edit'));
});

test('receipt settings live inside settings without duplicate main settings menu', function () {
    $settingsLayout = file_get_contents(resource_path('js/layouts/settings/layout.tsx'));
    $appSidebar = file_get_contents(resource_path('js/components/app-sidebar.tsx'));
    $receiptPage = file_get_contents(resource_path('js/pages/orders/receipt.tsx'));

    expect($settingsLayout)
        ->toContain("title: 'Struk'")
        ->toContain("from '@/routes/receipt'");

    expect($appSidebar)
        ->not->toContain("title: 'Settings'")
        ->not->toContain("from '@/routes/settings'");

    expect($receiptPage)
        ->toContain('setting.logo_url')
        ->toContain('src={setting.logo_url}');
});

test('admin can view receipt settings in the settings area', function () {
    Storage::fake('public');

    $admin = User::factory()->admin()->create();
    $setting = Setting::query()->create([
        'store_name' => 'Kopi Dartech',
        'address' => 'Jl. Mawar 1',
        'phone' => '08123456789',
        'receipt_footer' => 'Terima kasih',
        'logo' => 'settings/logo.png',
    ]);

    Storage::disk('public')->put($setting->logo, 'logo');

    $this
        ->actingAs($admin)
        ->get(route('receipt.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/receipt')
            ->where('setting.store_name', 'Kopi Dartech')
            ->where('setting.logo_url', Storage::url($setting->logo))
            ->etc()
        );
});

test('cashier cannot access receipt settings', function () {
    $cashier = User::factory()->cashier()->create();

    $this
        ->actingAs($cashier)
        ->get(route('receipt.edit'))
        ->assertForbidden();

    $this
        ->actingAs($cashier)
        ->post(route('receipt.update'), [
            '_method' => 'PUT',
            'store_name' => 'Kasir Store',
        ])
        ->assertForbidden();
});

test('admin can update receipt settings and replace logo', function () {
    Storage::fake('public');

    $admin = User::factory()->admin()->create();
    $setting = Setting::query()->create([
        'store_name' => 'Old Store',
        'logo' => 'settings/old-logo.png',
    ]);

    Storage::disk('public')->put($setting->logo, 'old');

    $this
        ->actingAs($admin)
        ->post(route('receipt.update'), [
            '_method' => 'PUT',
            'store_name' => 'New Store',
            'address' => 'Jl. Baru',
            'phone' => '0800000000',
            'receipt_footer' => 'Datang kembali',
            'logo' => UploadedFile::fake()->image('new-logo.png'),
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('receipt.edit'));

    $setting->refresh();

    expect($setting->store_name)->toBe('New Store')
        ->and($setting->address)->toBe('Jl. Baru')
        ->and($setting->phone)->toBe('0800000000')
        ->and($setting->receipt_footer)->toBe('Datang kembali')
        ->and($setting->logo)->not->toBe('settings/old-logo.png');

    Storage::disk('public')->assertMissing('settings/old-logo.png');
    Storage::disk('public')->assertExists($setting->logo);
});

test('receipt page exposes configured logo url', function () {
    Storage::fake('public');

    $cashier = User::factory()->cashier()->create(['name' => 'Sinta']);
    $setting = Setting::query()->create([
        'store_name' => 'Kopi Dartech',
        'logo' => 'settings/receipt-logo.png',
    ]);
    Storage::disk('public')->put($setting->logo, 'logo');

    $order = Order::query()->create([
        'queue_number' => 1,
        'invoice_number' => 'INV-RECEIPT-001',
        'customer_name' => 'Budi',
        'order_type' => 'dine_in',
        'subtotal' => 20000,
        'grand_total' => 20000,
        'payment_method' => 'cash',
        'paid_amount' => 25000,
        'change_amount' => 5000,
        'status' => 'paid',
        'cashier_id' => $cashier->id,
        'paid_at' => now(),
    ]);

    $order->items()->create([
        'product_name' => 'Kopi Susu',
        'price' => 20000,
        'qty' => 1,
        'subtotal' => 20000,
    ]);

    $this
        ->actingAs($cashier)
        ->get(route('orders.receipt', $order))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('orders/receipt')
            ->where('setting.store_name', 'Kopi Dartech')
            ->where('setting.logo_url', Storage::url($setting->logo))
            ->where('order.cashier.name', 'Sinta')
            ->has('order.items', 1)
        );
});
