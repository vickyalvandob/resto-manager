import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Pencil,
    Plus,
    Search,
    Trash2,
    UsersRound,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import { destroy as destroyUser } from '@/actions/App/Http/Controllers/UserController';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/date';
import {
    create as newUser,
    edit as editUser,
    index as usersIndex,
} from '@/routes/users';
import type { ManagedUser, PaginatedData, UserRole } from '@/types';

type RoleOption = {
    value: UserRole;
    label: string;
};

type UsersIndexProps = {
    users: PaginatedData<ManagedUser>;
    filters: {
        search: string;
        role: string;
    };
    roleOptions: RoleOption[];
};

const roleLabels: Record<UserRole, string> = {
    admin: 'Admin',
    cashier: 'Cashier',
};

function getVisiblePages(currentPage: number, lastPage: number): number[] {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(lastPage, currentPage + 2);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function UsersIndex({
    users,
    filters,
    roleOptions,
}: UsersIndexProps) {
    const [search, setSearch] = useState(filters.search);
    const [role, setRole] = useState(filters.role);
    const visiblePages = getVisiblePages(users.current_page, users.last_page);

    function applyFilters(event?: FormEvent<HTMLFormElement>): void {
        event?.preventDefault();

        router.get(
            usersIndex(),
            {
                search: search || undefined,
                role: role || undefined,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    }

    function deleteUser(user: ManagedUser): void {
        if (!user.can_delete) {
            return;
        }

        router.delete(destroyUser(user.id), {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title="Users" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                    <div>
                        <h1 className="text-2xl font-semibold">Users</h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola akun admin dan kasir.
                        </p>
                    </div>

                    <Button asChild>
                        <Link href={newUser()}>
                            <Plus />
                            User
                        </Link>
                    </Button>
                </div>

                <form
                    onSubmit={applyFilters}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto_auto]"
                >
                    <div className="relative">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari nama atau email"
                            className="pl-9"
                        />
                    </div>
                    <select
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        <option value="">Semua role</option>
                        {roleOptions.map((roleOption) => (
                            <option
                                key={roleOption.value}
                                value={roleOption.value}
                            >
                                {roleOption.label}
                            </option>
                        ))}
                    </select>
                    <Button type="submit">Cari</Button>
                    <Button variant="outline" asChild>
                        <Link href={usersIndex()}>Reset</Link>
                    </Button>
                </form>

                <div className="overflow-hidden rounded-lg border bg-background">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3">Nama</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="hidden px-4 py-3 md:table-cell">
                                        Order
                                    </th>
                                    <th className="hidden px-4 py-3 lg:table-cell">
                                        Dibuat
                                    </th>
                                    <th className="w-28 px-4 py-3 text-right">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {users.data.length > 0 ? (
                                    users.data.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-muted/30"
                                        >
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                                        <UsersRound className="size-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate font-medium">
                                                            {user.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground lg:hidden">
                                                            {formatDateTime(
                                                                user.created_at,
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {user.email}
                                            </td>
                                            <td className="px-4 py-4">
                                                <Badge
                                                    variant={
                                                        user.role === 'admin'
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {roleLabels[user.role]}
                                                </Badge>
                                            </td>
                                            <td className="hidden px-4 py-4 md:table-cell">
                                                {user.orders_count}
                                            </td>
                                            <td className="hidden px-4 py-4 text-muted-foreground lg:table-cell">
                                                {formatDateTime(
                                                    user.created_at,
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="icon"
                                                        title="Edit user"
                                                    >
                                                        <Link
                                                            href={editUser(
                                                                user.id,
                                                            )}
                                                            aria-label={`Edit ${user.name}`}
                                                        >
                                                            <Pencil />
                                                        </Link>
                                                    </Button>
                                                    <DeleteUserDialog
                                                        user={user}
                                                        onDelete={deleteUser}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-16 text-center text-muted-foreground"
                                        >
                                            User tidak ditemukan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {users.total > 0 && (
                        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {users.from} to {users.to} of{' '}
                                {users.total}
                            </p>

                            <div className="flex items-center gap-1">
                                <PaginationButton
                                    page={users.current_page - 1}
                                    disabled={users.current_page === 1}
                                    filters={{ search, role }}
                                    ariaLabel="Previous page"
                                >
                                    <ChevronLeft />
                                </PaginationButton>
                                {visiblePages.map((page) => (
                                    <PaginationButton
                                        key={page}
                                        page={page}
                                        active={page === users.current_page}
                                        filters={{ search, role }}
                                    >
                                        {page}
                                    </PaginationButton>
                                ))}
                                <PaginationButton
                                    page={users.current_page + 1}
                                    disabled={
                                        users.current_page === users.last_page
                                    }
                                    filters={{ search, role }}
                                    ariaLabel="Next page"
                                >
                                    <ChevronRight />
                                </PaginationButton>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

UsersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Users',
            href: usersIndex(),
        },
    ],
};

function DeleteUserDialog({
    user,
    onDelete,
}: {
    user: ManagedUser;
    onDelete: (user: ManagedUser) => void;
}) {
    if (!user.can_delete) {
        return (
            <Button
                type="button"
                variant="outline"
                size="icon"
                disabled
                title="User ini tidak bisa dihapus"
                aria-label={`Hapus ${user.name}`}
            >
                <Trash2 />
            </Button>
        );
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    title="Hapus user"
                    aria-label={`Hapus ${user.name}`}
                >
                    <Trash2 />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus user?</AlertDialogTitle>
                    <AlertDialogDescription>
                        User {user.name} akan dihapus permanen. Tindakan ini
                        tidak dapat dibatalkan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
                        onClick={() => onDelete(user)}
                    >
                        Hapus
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function PaginationButton({
    page,
    active = false,
    disabled = false,
    filters,
    ariaLabel,
    children,
}: {
    page: number;
    active?: boolean;
    disabled?: boolean;
    filters: { search: string; role: string };
    ariaLabel?: string;
    children: ReactNode;
}) {
    if (disabled) {
        return (
            <Button type="button" variant="outline" size="icon" disabled>
                {children}
            </Button>
        );
    }

    return (
        <Button
            asChild
            variant={active ? 'default' : 'outline'}
            size="icon"
            aria-current={active ? 'page' : undefined}
        >
            <Link
                href={usersIndex({
                    query: {
                        page,
                        search: filters.search || undefined,
                        role: filters.role || undefined,
                    },
                })}
                preserveScroll
                aria-label={ariaLabel ?? `Page ${page}`}
            >
                {children}
            </Link>
        </Button>
    );
}
