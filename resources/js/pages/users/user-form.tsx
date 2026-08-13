import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';
import type { FormEvent } from 'react';
import {
    store as storeUser,
    update as updateUser,
} from '@/actions/App/Http/Controllers/UserController';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { index as usersIndex } from '@/routes/users';
import type { ManagedUser, UserRole } from '@/types';

type RoleOption = {
    value: UserRole;
    label: string;
};

type UserFormData = {
    name: string;
    email: string;
    role: UserRole;
    password: string;
    password_confirmation: string;
};

type UserFormProps = {
    roleOptions: RoleOption[];
    user?: ManagedUser;
    submitLabel: string;
};

function userDefaults(user?: ManagedUser): UserFormData {
    return {
        name: user?.name ?? '',
        email: user?.email ?? '',
        role: user?.role ?? 'cashier',
        password: '',
        password_confirmation: '',
    };
}

export function UserForm({ roleOptions, user, submitLabel }: UserFormProps) {
    const { data, setData, post, processing, errors, reset } =
        useForm<UserFormData>(userDefaults(user));

    function submitUser(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        const action = user
            ? updateUser.form(user.id).action
            : storeUser.form().action;

        post(action, {
            preserveScroll: true,
            onSuccess: () => reset('password', 'password_confirmation'),
        });
    }

    return (
        <form
            onSubmit={submitUser}
            className="overflow-hidden rounded-lg border border-sidebar-border/70 bg-background dark:border-sidebar-border"
        >
            <div className="grid gap-5 p-5 md:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="name">Nama</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(event) =>
                            setData('name', event.target.value)
                        }
                        required
                        autoComplete="name"
                        aria-invalid={Boolean(errors.name)}
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(event) =>
                            setData('email', event.target.value)
                        }
                        required
                        autoComplete="email"
                        aria-invalid={Boolean(errors.email)}
                    />
                    <InputError message={errors.email} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <select
                        id="role"
                        value={data.role}
                        onChange={(event) =>
                            setData('role', event.target.value as UserRole)
                        }
                        required
                        aria-invalid={Boolean(errors.role)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {roleOptions.map((role) => (
                            <option key={role.value} value={role.value}>
                                {role.label}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.role} />
                </div>

                <div className="hidden md:block" />

                <div className="grid gap-2">
                    <Label htmlFor="password">
                        {user ? 'Password baru' : 'Password'}
                    </Label>
                    <PasswordInput
                        id="password"
                        value={data.password}
                        onChange={(event) =>
                            setData('password', event.target.value)
                        }
                        required={!user}
                        autoComplete="new-password"
                        aria-invalid={Boolean(errors.password)}
                    />
                    <InputError message={errors.password} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password_confirmation">
                        Konfirmasi Password
                    </Label>
                    <PasswordInput
                        id="password_confirmation"
                        value={data.password_confirmation}
                        onChange={(event) =>
                            setData('password_confirmation', event.target.value)
                        }
                        required={!user || data.password !== ''}
                        autoComplete="new-password"
                        aria-invalid={Boolean(errors.password_confirmation)}
                    />
                    <InputError message={errors.password_confirmation} />
                </div>
            </div>

            <div className="flex flex-col gap-3 border-t bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
                <Button variant="outline" asChild>
                    <Link href={usersIndex()}>
                        <ArrowLeft />
                        Kembali
                    </Link>
                </Button>
                <Button type="submit" disabled={processing}>
                    <Save />
                    {processing ? 'Menyimpan...' : submitLabel}
                </Button>
            </div>
        </form>
    );
}
