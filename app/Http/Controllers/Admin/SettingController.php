<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateSettingRequest;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('settings/receipt', [
            'setting' => $this->payload(Setting::current()),
        ]);
    }

    public function update(UpdateSettingRequest $request): RedirectResponse
    {
        $setting = Setting::current();
        $data = $request->validated();

        unset($data['remove_logo']);

        if ($request->boolean('remove_logo') && $setting->logo) {
            Storage::disk('public')->delete($setting->logo);
            $data['logo'] = null;
        }

        if ($request->hasFile('logo')) {
            if ($setting->logo) {
                Storage::disk('public')->delete($setting->logo);
            }

            $data['logo'] = $request->file('logo')->store('settings', 'public');
        }

        $setting->update($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Settings updated.')]);

        return to_route('receipt.edit');
    }

    /**
     * @return array{id: int, store_name: string, address: string|null, phone: string|null, receipt_footer: string|null, logo: string|null, logo_url: string|null}
     */
    private function payload(Setting $setting): array
    {
        return [
            'id' => $setting->id,
            'store_name' => $setting->store_name,
            'address' => $setting->address,
            'phone' => $setting->phone,
            'receipt_footer' => $setting->receipt_footer,
            'logo' => $setting->logo,
            'logo_url' => $setting->logo ? Storage::url($setting->logo) : null,
        ];
    }
}
