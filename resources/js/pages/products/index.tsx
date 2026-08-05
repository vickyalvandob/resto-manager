import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ImageIcon,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
    destroy as destroyProduct,
    edit as editProduct,
    create as newProduct,
} from '@/actions/App/Http/Controllers/ProductController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { index as productsIndex } from '@/routes/products';
import type { PaginatedData, Product } from '@/types';

type ProductsIndexProps = {
    products: PaginatedData<Product>;
};

const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

function formatCurrency(value: string | number): string {
    const amount = Number(value);

    return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function getVisiblePages(currentPage: number, lastPage: number): number[] {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(lastPage, currentPage + 2);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function ProductsIndex({ products }: ProductsIndexProps) {
    const visiblePages = getVisiblePages(
        products.current_page,
        products.last_page,
    );

    function deleteProduct(product: Product): void {
        if (!window.confirm(`Delete ${product.name}?`)) {
            return;
        }

        router.delete(destroyProduct(product.id), {
            preserveScroll: true,
        });
    }

    return (
        <>
            <Head title="Products" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-semibold">Products</h1>
                        <p className="text-sm text-muted-foreground">
                            {products.total} product
                            {products.total === 1 ? '' : 's'}
                        </p>
                    </div>

                    <Button asChild>
                        <Link href={newProduct()}>
                            <Plus />
                            New Product
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-lg border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="hidden px-4 py-3 md:table-cell">
                                        Category
                                    </th>
                                    <th className="px-4 py-3">Price</th>
                                    <th className="hidden px-4 py-3 sm:table-cell">
                                        Stock
                                    </th>
                                    <th className="hidden px-4 py-3 lg:table-cell">
                                        Status
                                    </th>
                                    <th className="w-28 px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {products.data.length > 0 ? (
                                    products.data.map((product) => (
                                        <tr
                                            key={product.id}
                                            className="transition-colors hover:bg-muted/30"
                                        >
                                            <td className="px-4 py-4">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    {product.image_url ? (
                                                        <img
                                                            src={
                                                                product.image_url
                                                            }
                                                            alt={product.name}
                                                            className="size-11 rounded-md border object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex size-11 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                                                            <ImageIcon className="size-5" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <div className="truncate font-medium">
                                                            {product.name}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:hidden">
                                                            <span>
                                                                {
                                                                    product
                                                                        .category
                                                                        .name
                                                                }
                                                            </span>
                                                            <span className="sm:hidden">
                                                                Stock{' '}
                                                                {product.stock}
                                                            </span>
                                                            <Badge
                                                                variant={
                                                                    product.is_active
                                                                        ? 'secondary'
                                                                        : 'outline'
                                                                }
                                                                className="lg:hidden"
                                                            >
                                                                {product.is_active
                                                                    ? 'Active'
                                                                    : 'Inactive'}
                                                            </Badge>
                                                        </div>
                                                        {product.description && (
                                                            <div className="mt-1 hidden truncate text-muted-foreground sm:block">
                                                                {
                                                                    product.description
                                                                }
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden truncate px-4 py-4 text-muted-foreground md:table-cell">
                                                {product.category.name}
                                            </td>
                                            <td className="px-4 py-4 font-medium whitespace-nowrap">
                                                {formatCurrency(product.price)}
                                            </td>
                                            <td className="hidden px-4 py-4 sm:table-cell">
                                                {product.stock}
                                            </td>
                                            <td className="hidden px-4 py-4 lg:table-cell">
                                                <Badge
                                                    variant={
                                                        product.is_active
                                                            ? 'secondary'
                                                            : 'outline'
                                                    }
                                                >
                                                    {product.is_active
                                                        ? 'Active'
                                                        : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="icon"
                                                        title="Edit product"
                                                    >
                                                        <Link
                                                            href={editProduct(
                                                                product.id,
                                                            )}
                                                            aria-label={`Edit ${product.name}`}
                                                        >
                                                            <Pencil />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={() =>
                                                            deleteProduct(
                                                                product,
                                                            )
                                                        }
                                                        title="Delete product"
                                                        aria-label={`Delete ${product.name}`}
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
                                            colSpan={6}
                                            className="px-4 py-16 text-center text-muted-foreground"
                                        >
                                            No products yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {products.total > 0 && (
                        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {products.from} to {products.to} of{' '}
                                {products.total}
                            </p>

                            <div className="flex items-center gap-1">
                                <PaginationButton
                                    page={products.current_page - 1}
                                    disabled={products.current_page === 1}
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
                                        active={page === products.current_page}
                                    >
                                        {page}
                                    </PaginationButton>
                                ))}

                                {visiblePages[visiblePages.length - 1] <
                                    products.last_page && (
                                    <>
                                        {visiblePages[visiblePages.length - 1] <
                                            products.last_page - 1 && (
                                            <span className="px-2 text-sm text-muted-foreground">
                                                ...
                                            </span>
                                        )}
                                        <PaginationButton
                                            page={products.last_page}
                                        >
                                            {products.last_page}
                                        </PaginationButton>
                                    </>
                                )}

                                <PaginationButton
                                    page={products.current_page + 1}
                                    disabled={
                                        products.current_page ===
                                        products.last_page
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

ProductsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Products',
            href: productsIndex(),
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
                href={productsIndex({ query: page === 1 ? {} : { page } })}
                preserveScroll
                aria-label={ariaLabel ?? `Page ${page}`}
            >
                {children}
            </Link>
        </Button>
    );
}
