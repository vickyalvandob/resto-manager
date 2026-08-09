import { Head, useForm } from '@inertiajs/react';
import { Save, Upload } from 'lucide-react';
import type { FormEvent } from 'react';
import { update as updateSettings } from '@/actions/App/Http/Controllers/Admin/SettingController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { index as settingsIndex } from '@/routes/settings';
import type { StoreSetting } from '@/types';

type SettingsProps = {
    setting: StoreSetting;
};

type SettingFormData = {
    store_name: string;
    address: string;
    phone: string;
    receipt_footer: string;
    logo: File | null;
    remove_logo: boolean;
};

export default function StoreSettingsIndex({ setting }: SettingsProps) {
    const { data, setData, post, processing, progress, errors } =
        useForm<SettingFormData>({
            store_name: setting.store_name,
            address: setting.address ?? '',
            phone: setting.phone ?? '',
            receipt_footer: setting.receipt_footer ?? '',
            logo: null,
            remove_logo: false,
        });

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        post(updateSettings.form().action, {
            forceFormData: true,
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title="Settings" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Settings</h1>
                    <p className="text-sm text-muted-foreground">
                        Store information for receipts
                    </p>
                </div>

                <form
                    onSubmit={submit}
                    className="overflow-hidden rounded-lg border bg-background"
                >
                    <div className="grid gap-5 p-5 md:grid-cols-2">
                        <div className="grid gap-2 md:col-span-2">
                            <Label htmlFor="store_name">Store Name</Label>
                            <Input
                                id="store_name"
                                value={data.store_name}
                                onChange={(event) =>
                                    setData('store_name', event.target.value)
                                }
                                required
                            />
                            <InputError message={errors.store_name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                value={data.phone}
                                onChange={(event) =>
                                    setData('phone', event.target.value)
                                }
                            />
                            <InputError message={errors.phone} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                value={data.address}
                                onChange={(event) =>
                                    setData('address', event.target.value)
                                }
                            />
                            <InputError message={errors.address} />
                        </div>

                        <div className="grid gap-2 md:col-span-2">
                            <Label htmlFor="receipt_footer">
                                Receipt Footer
                            </Label>
                            <Input
                                id="receipt_footer"
                                value={data.receipt_footer}
                                onChange={(event) =>
                                    setData(
                                        'receipt_footer',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError message={errors.receipt_footer} />
                        </div>

                        <div className="grid gap-3 md:col-span-2">
                            <Label htmlFor="logo">Logo</Label>
                            <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-input bg-muted/20 px-4 py-6 text-center transition-colors hover:bg-muted/40">
                                <Upload className="size-5 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                    {data.logo ? data.logo.name : 'Choose logo'}
                                </span>
                                <Input
                                    id="logo"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(event) =>
                                        setData(
                                            'logo',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                    className="sr-only"
                                />
                            </label>
                            {setting.logo_url && !data.remove_logo && (
                                <img
                                    src={setting.logo_url}
                                    alt={setting.store_name}
                                    className="size-24 rounded-md border object-cover"
                                />
                            )}
                            <InputError message={errors.logo} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 border-t bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        {setting.logo_url ? (
                            <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Checkbox
                                    checked={data.remove_logo}
                                    onCheckedChange={(checked) =>
                                        setData('remove_logo', checked === true)
                                    }
                                />
                                Remove logo
                            </label>
                        ) : (
                            <span />
                        )}

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            {progress && (
                                <progress
                                    value={progress.percentage}
                                    max="100"
                                    className="h-2 w-full sm:w-32"
                                >
                                    {progress.percentage}%
                                </progress>
                            )}
                            <Button type="submit" disabled={processing}>
                                <Save />
                                {processing ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

StoreSettingsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Settings',
            href: settingsIndex(),
        },
    ],
};
