import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Pencil,
    Plus,
    Tags,
    Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
    destroy as destroyCategory,
    edit as editCategory,
    create as newCategory,
} from '@/actions/App/Http/Controllers/CategoryController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { index as categoriesIndex } from '@/routes/categories';
import type { CategoryWithProductCount, PaginatedData } from '@/types';

type CategoriesIndexProps = {
    categories: PaginatedData<CategoryWithProductCount>;
};

function getVisiblePages(currentPage: number, lastPage: number): number[] {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(lastPage, currentPage + 2);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function formatProductsCount(count: number): string {
    return `${count} product${count === 1 ? '' : 's'}`;
}

export default function CategoriesIndex({ categories }: CategoriesIndexProps) {
    const visiblePages = getVisiblePages(
        categories.current_page,
        categories.last_page,
    );

    function deleteCategory(category: CategoryWithProductCount): void {
        if (category.products_count > 0) {
            window.alert(
                'Move or delete products before deleting this category.',
            );

            return;
        }

        if (!window.confirm(`Delete ${category.name}?`)) {
            return;
        }

        router.delete(destroyCategory(category.id), {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title="Categories" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-semibold">Categories</h1>
                        <p className="text-sm text-muted-foreground">
                            {categories.total} categor
                            {categories.total === 1 ? 'y' : 'ies'}
                        </p>
                    </div>

                    <Button asChild>
                        <Link href={newCategory()}>
                            <Plus />
                            New Category
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-lg border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="hidden w-40 px-4 py-3 sm:table-cell">
                                        Products
                                    </th>
                                    <th className="w-28 px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {categories.data.length > 0 ? (
                                    categories.data.map((category) => (
                                        <tr
                                            key={category.id}
                                            className="transition-colors hover:bg-muted/30"
                                        >
                                            <td className="px-4 py-4">
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium">
                                                        {category.name}
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                                        {category.description && (
                                                            <span className="truncate text-muted-foreground">
                                                                {
                                                                    category.description
                                                                }
                                                            </span>
                                                        )}
                                                        <Badge
                                                            variant="outline"
                                                            className="sm:hidden"
                                                        >
                                                            {formatProductsCount(
                                                                category.products_count,
                                                            )}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden px-4 py-4 sm:table-cell">
                                                <Badge variant="secondary">
                                                    {formatProductsCount(
                                                        category.products_count,
                                                    )}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="icon"
                                                        title="Edit category"
                                                    >
                                                        <Link
                                                            href={editCategory(
                                                                category.id,
                                                            )}
                                                            aria-label={`Edit ${category.name}`}
                                                        >
                                                            <Pencil />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={() =>
                                                            deleteCategory(
                                                                category,
                                                            )
                                                        }
                                                        title="Delete category"
                                                        aria-label={`Delete ${category.name}`}
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="px-4 py-16 text-center text-muted-foreground"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <Tags className="size-8" />
                                                <span>No categories yet.</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {categories.total > 0 && (
                        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {categories.from} to {categories.to} of{' '}
                                {categories.total}
                            </p>

                            <div className="flex items-center gap-1">
                                <PaginationButton
                                    page={categories.current_page - 1}
                                    disabled={categories.current_page === 1}
                                    ariaLabel="Previous page"
                                >
                                    <ChevronLeft />
                                </PaginationButton>

                                {visiblePages[0] > 1 && (
                                    <>
                                        <PaginationButton page={1}>
                                            1
                                        </PaginationButton>
                                        {visiblePages[0] > 2 && (
                                            <span className="px-2 text-sm text-muted-foreground">
                                                ...
                                            </span>
                                        )}
                                    </>
                                )}

                                {visiblePages.map((page) => (
                                    <PaginationButton
                                        key={page}
                                        page={page}
                                        active={
                                            page === categories.current_page
                                        }
                                    >
                                        {page}
                                    </PaginationButton>
                                ))}

                                {visiblePages[visiblePages.length - 1] <
                                    categories.last_page && (
                                    <>
                                        {visiblePages[visiblePages.length - 1] <
                                            categories.last_page - 1 && (
                                            <span className="px-2 text-sm text-muted-foreground">
                                                ...
                                            </span>
                                        )}
                                        <PaginationButton
                                            page={categories.last_page}
                                        >
                                            {categories.last_page}
                                        </PaginationButton>
                                    </>
                                )}

                                <PaginationButton
                                    page={categories.current_page + 1}
                                    disabled={
                                        categories.current_page ===
                                        categories.last_page
                                    }
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

CategoriesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Categories',
            href: categoriesIndex(),
        },
    ],
};

function PaginationButton({
    page,
    active = false,
    disabled = false,
    ariaLabel,
    children,
}: {
    page: number;
    active?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
    children: ReactNode;
}) {
    if (disabled) {
        return (
            <Button
                type="button"
                variant="outline"
                size="icon"
                disabled
                aria-label={ariaLabel}
            >
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
                href={categoriesIndex({ query: page === 1 ? {} : { page } })}
                preserveScroll
                aria-label={ariaLabel ?? `Page ${page}`}
            >
                {children}
            </Link>
        </Button>
    );
}
