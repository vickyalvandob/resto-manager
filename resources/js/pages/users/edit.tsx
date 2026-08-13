import { Head } from '@inertiajs/react';
import { UserForm } from '@/pages/users/user-form';
import { index as usersIndex } from '@/routes/users';
import type { ManagedUser, UserRole } from '@/types';

type RoleOption = {
    value: UserRole;
    label: string;
};

type UsersEditProps = {
    user: ManagedUser;
    roleOptions: RoleOption[];
};

export default function UsersEdit({ user, roleOptions }: UsersEditProps) {
    return (
        <>
            <Head title={`Edit ${user.name}`} />

            <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Edit User</h1>
                    <p className="text-sm text-muted-foreground">
                        Ubah detail akun {user.name}.
                    </p>
                </div>

                <UserForm
                    roleOptions={roleOptions}
                    user={user}
                    submitLabel="Simpan User"
                />
            </div>
        </>
    );
}

UsersEdit.layout = {
    breadcrumbs: [
        {
            title: 'Users',
            href: usersIndex(),
        },
        {
            title: 'Edit User',
            href: usersIndex(),
        },
    ],
};
