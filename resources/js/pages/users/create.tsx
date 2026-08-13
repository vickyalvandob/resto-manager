import { Head } from '@inertiajs/react';
import { UserForm } from '@/pages/users/user-form';
import { create as newUser, index as usersIndex } from '@/routes/users';
import type { UserRole } from '@/types';

type RoleOption = {
    value: UserRole;
    label: string;
};

type UsersCreateProps = {
    roleOptions: RoleOption[];
};

export default function UsersCreate({ roleOptions }: UsersCreateProps) {
    return (
        <>
            <Head title="User Baru" />

            <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">User Baru</h1>
                    <p className="text-sm text-muted-foreground">
                        Tambahkan akun admin atau kasir.
                    </p>
                </div>

                <UserForm
                    roleOptions={roleOptions}
                    submitLabel="Buat User"
                />
            </div>
        </>
    );
}

UsersCreate.layout = {
    breadcrumbs: [
        {
            title: 'Users',
            href: usersIndex(),
        },
        {
            title: 'User Baru',
            href: newUser(),
        },
    ],
};
