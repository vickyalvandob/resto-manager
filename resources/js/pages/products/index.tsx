import { Head, Link, router } from '@inertiajs/react';
import {
    Eye,
    EyeOff,
    GripVertical,
    LoaderCircle,
    Pencil,
    Plus,
    Tags,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import {
    destroy as destroyCategory,
    edit as editCategory,
    create as newCategory,
    reorder as reorderCategories,
} from '@/actions/App/Http/Controllers/CategoryController';
import {
    destroy as destroyProduct,
    edit as editProduct,
    create as newProduct,
    reorder as reorderProducts,
    toggleAvailability,
} from '@/actions/App/Http/Controllers/ProductController';
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
import { useInitials } from '@/hooks/use-initials';
import { formatRupiah } from '@/lib/currency';
import { cn } from '@/lib/utils';
import { index as productsIndex } from '@/routes/products';
import type { CategoryWithProductCount, Product } from '@/types';

type ProductsIndexProps = {
    categories: CategoryWithProductCount[];
    products: Product[];
};

type DropPlacement = 'before' | 'after';

type DropTarget = {
    id: number;
    placement: DropPlacement;
};

function productCount(count: number): string {
    return `${count} produk`;
}

function itemIds<T extends { id: number }>(items: T[]): number[] {
    return items.map((item) => item.id);
}

function groupProductIdsByCategory(
    products: Product[],
): Record<number, number[]> {
    return products.reduce<Record<number, number[]>>((groups, product) => {
        groups[product.category_id] ??= [];
        groups[product.category_id].push(product.id);

        return groups;
    }, {});
}

function hasSameOrder<T extends { id: number }>(
    currentItems: T[],
    nextItems: T[],
): boolean {
    return itemIds(currentItems).join(',') === itemIds(nextItems).join(',');
}

function moveItem<T extends { id: number }>(
    items: T[],
    draggedItemId: number,
    targetItemId: number,
    placement: DropPlacement,
): T[] {
    if (draggedItemId === targetItemId) {
        return items;
    }

    const draggedItem = items.find((item) => item.id === draggedItemId);

    if (!draggedItem) {
        return items;
    }

    const remainingItems = items.filter((item) => item.id !== draggedItemId);
    const targetIndex = remainingItems.findIndex(
        (item) => item.id === targetItemId,
    );

    if (targetIndex === -1) {
        return items;
    }

    const insertIndex = placement === 'after' ? targetIndex + 1 : targetIndex;
    const nextItems = [...remainingItems];

    nextItems.splice(insertIndex, 0, draggedItem);

    return nextItems;
}

function dropPlacementFromEvent(event: DragEvent<HTMLElement>): DropPlacement {
    const bounds = event.currentTarget.getBoundingClientRect();

    return event.clientY > bounds.top + bounds.height / 2 ? 'after' : 'before';
}

type DeleteCategoryDialogProps = {
    category: CategoryWithProductCount;
    onDelete: (category: CategoryWithProductCount) => void;
};

function DeleteCategoryDialog({
    category,
    onDelete,
}: DeleteCategoryDialogProps) {
    const hasProducts = category.products_count > 0;

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Hapus kategori"
                    aria-label={`Hapus ${category.name}`}
                >
                    <Trash2 />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {hasProducts
                            ? 'Kategori masih berisi produk'
                            : 'Hapus kategori?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {hasProducts
                            ? `Pindahkan atau hapus ${productCount(category.products_count)} di ${category.name} dulu.`
                            : `Kategori ${category.name} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>
                        {hasProducts ? 'Mengerti' : 'Batal'}
                    </AlertDialogCancel>
                    {!hasProducts && (
                        <AlertDialogAction
                            className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
                            onClick={() => onDelete(category)}
                        >
                            Hapus
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

type DeleteProductDialogProps = {
    product: Product;
    onDelete: (product: Product) => void;
};

function DeleteProductDialog({ product, onDelete }: DeleteProductDialogProps) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    title="Hapus produk"
                    aria-label={`Hapus ${product.name}`}
                >
                    <Trash2 />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Hapus produk?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Produk {product.name} akan dihapus permanen. Tindakan
                        ini tidak dapat dibatalkan.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40"
                        onClick={() => onDelete(product)}
                    >
                        Hapus
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function ProductsIndex({
    categories,
    products,
}: ProductsIndexProps) {
    const getInitials = useInitials();
    const [activeCategoryId, setActiveCategoryId] = useState<number | null>(
        () => categories[0]?.id ?? null,
    );
    const [localCategoryIds, setLocalCategoryIds] = useState(() =>
        itemIds(categories),
    );
    const [localProductIdsByCategory, setLocalProductIdsByCategory] = useState(
        () => groupProductIdsByCategory(products),
    );
    const [draggedCategoryId, setDraggedCategoryId] = useState<number | null>(
        null,
    );
    const [draggedProductId, setDraggedProductId] = useState<number | null>(
        null,
    );
    const [categoryDropTarget, setCategoryDropTarget] =
        useState<DropTarget | null>(null);
    const [productDropTarget, setProductDropTarget] =
        useState<DropTarget | null>(null);
    const [isSavingCategoryOrder, setIsSavingCategoryOrder] = useState(false);
    const [savingProductCategoryId, setSavingProductCategoryId] = useState<
        number | null
    >(null);

    const categoriesById = useMemo(
        () => new Map(categories.map((category) => [category.id, category])),
        [categories],
    );
    const productsById = useMemo(
        () => new Map(products.map((product) => [product.id, product])),
        [products],
    );
    const orderedCategories = useMemo(() => {
        const hasValidLocalOrder =
            localCategoryIds.length === categories.length &&
            localCategoryIds.every((categoryId) =>
                categoriesById.has(categoryId),
            );

        return hasValidLocalOrder
            ? localCategoryIds.map(
                  (categoryId) =>
                      categoriesById.get(
                          categoryId,
                      ) as CategoryWithProductCount,
              )
            : categories;
    }, [categories, categoriesById, localCategoryIds]);
    const selectedCategoryId = orderedCategories.some(
        (category) => category.id === activeCategoryId,
    )
        ? activeCategoryId
        : (orderedCategories[0]?.id ?? null);
    const selectedCategory =
        orderedCategories.find(
            (category) => category.id === selectedCategoryId,
        ) ?? null;
    const isSavingProductOrder =
        selectedCategoryId !== null &&
        savingProductCategoryId === selectedCategoryId;
    const activeProducts =
        selectedCategoryId === null
            ? []
            : productsForCategory(selectedCategoryId);

    function productsForCategory(categoryId: number): Product[] {
        const categoryProducts = products.filter(
            (product) => product.category_id === categoryId,
        );
        const localProductIds = localProductIdsByCategory[categoryId] ?? [];
        const categoryProductIds = new Set(
            categoryProducts.map((product) => product.id),
        );
        const hasValidLocalOrder =
            localProductIds.length === categoryProducts.length &&
            localProductIds.every((productId) =>
                categoryProductIds.has(productId),
            );

        return hasValidLocalOrder
            ? localProductIds.map(
                  (productId) => productsById.get(productId) as Product,
              )
            : categoryProducts;
    }

    function saveCategoryOrder(
        nextCategories: CategoryWithProductCount[],
    ): void {
        if (hasSameOrder(orderedCategories, nextCategories)) {
            return;
        }

        setLocalCategoryIds(itemIds(nextCategories));
        setIsSavingCategoryOrder(true);

        router.put(
            reorderCategories(),
            {
                categories: itemIds(nextCategories),
            },
            {
                preserveScroll: true,
                onError: () => setLocalCategoryIds(itemIds(categories)),
                onFinish: () => setIsSavingCategoryOrder(false),
            },
        );
    }

    function saveProductOrder(
        categoryId: number,
        nextProducts: Product[],
    ): void {
        const currentProducts = productsForCategory(categoryId);

        if (hasSameOrder(currentProducts, nextProducts)) {
            return;
        }

        setLocalProductIdsByCategory((current) => ({
            ...current,
            [categoryId]: itemIds(nextProducts),
        }));
        setSavingProductCategoryId(categoryId);

        router.put(
            reorderProducts(),
            {
                category_id: categoryId,
                products: itemIds(nextProducts),
            },
            {
                preserveScroll: true,
                onError: () =>
                    setLocalProductIdsByCategory((current) => ({
                        ...current,
                        [categoryId]: itemIds(
                            products.filter(
                                (product) => product.category_id === categoryId,
                            ),
                        ),
                    })),
                onFinish: () => setSavingProductCategoryId(null),
            },
        );
    }

    function deleteCategory(category: CategoryWithProductCount): void {
        if (category.products_count > 0) {
            return;
        }

        router.delete(destroyCategory(category.id), {
            preserveScroll: true,
        });
    }

    function deleteProduct(product: Product): void {
        router.delete(destroyProduct(product.id), {
            preserveScroll: true,
        });
    }

    function toggleProduct(product: Product): void {
        router.put(
            toggleAvailability(product.id),
            {},
            { preserveScroll: true },
        );
    }

    function startDraggingCategory(
        event: DragEvent<HTMLButtonElement>,
        categoryId: number,
    ): void {
        if (isSavingCategoryOrder) {
            event.preventDefault();

            return;
        }

        setDraggedCategoryId(categoryId);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(categoryId));
    }

    function markCategoryDropTarget(
        event: DragEvent<HTMLLIElement>,
        categoryId: number,
    ): void {
        if (draggedCategoryId === null || draggedCategoryId === categoryId) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setCategoryDropTarget({
            id: categoryId,
            placement: dropPlacementFromEvent(event),
        });
    }

    function dropCategory(
        event: DragEvent<HTMLLIElement>,
        categoryId: number,
    ): void {
        event.preventDefault();

        if (draggedCategoryId === null) {
            return;
        }

        const placement =
            categoryDropTarget?.id === categoryId
                ? categoryDropTarget.placement
                : 'before';
        const nextCategories = moveItem(
            orderedCategories,
            draggedCategoryId,
            categoryId,
            placement,
        );

        setDraggedCategoryId(null);
        setCategoryDropTarget(null);
        saveCategoryOrder(nextCategories);
    }

    function startDraggingProduct(
        event: DragEvent<HTMLButtonElement>,
        productId: number,
    ): void {
        if (isSavingProductOrder) {
            event.preventDefault();

            return;
        }

        setDraggedProductId(productId);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(productId));
    }

    function markProductDropTarget(
        event: DragEvent<HTMLLIElement>,
        productId: number,
    ): void {
        if (draggedProductId === null || draggedProductId === productId) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setProductDropTarget({
            id: productId,
            placement: dropPlacementFromEvent(event),
        });
    }

    function dropProduct(
        event: DragEvent<HTMLLIElement>,
        productId: number,
    ): void {
        event.preventDefault();

        if (draggedProductId === null || selectedCategoryId === null) {
            return;
        }

        const placement =
            productDropTarget?.id === productId
                ? productDropTarget.placement
                : 'before';
        const nextProducts = moveItem(
            activeProducts,
            draggedProductId,
            productId,
            placement,
        );

        setDraggedProductId(null);
        setProductDropTarget(null);
        saveProductOrder(selectedCategoryId, nextProducts);
    }

    function endDragging(): void {
        setDraggedCategoryId(null);
        setDraggedProductId(null);
        setCategoryDropTarget(null);
        setProductDropTarget(null);
    }

    return (
        <>
            <Head title="Menu" />

            <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
                <div className="grid gap-1">
                    <h1 className="text-2xl font-semibold">Menu</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>{orderedCategories.length} kategori</span>
                        <span>{products.length} produk</span>
                        {(isSavingCategoryOrder || isSavingProductOrder) && (
                            <span className="inline-flex items-center gap-1.5">
                                <LoaderCircle className="size-3.5 animate-spin" />
                                Menyimpan
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
                    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                            <div>
                                <h2 className="font-semibold">Kategori</h2>
                                <p className="text-sm text-muted-foreground">
                                    {orderedCategories.length} item
                                </p>
                            </div>
                            <Button variant="outline" size="icon" asChild>
                                <Link
                                    href={newCategory()}
                                    aria-label="Tambah kategori"
                                >
                                    <Plus />
                                </Link>
                            </Button>
                        </div>

                        {orderedCategories.length > 0 ? (
                            <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
                                {orderedCategories.map((category) => {
                                    const isActive =
                                        selectedCategoryId === category.id;
                                    const isDragSource =
                                        draggedCategoryId === category.id;
                                    const isDropBefore =
                                        categoryDropTarget?.id ===
                                            category.id &&
                                        categoryDropTarget.placement ===
                                            'before' &&
                                        !isDragSource;
                                    const isDropAfter =
                                        categoryDropTarget?.id ===
                                            category.id &&
                                        categoryDropTarget.placement ===
                                            'after' &&
                                        !isDragSource;

                                    return (
                                        <li
                                            key={category.id}
                                            onDragOver={(event) =>
                                                markCategoryDropTarget(
                                                    event,
                                                    category.id,
                                                )
                                            }
                                            onDrop={(event) =>
                                                dropCategory(event, category.id)
                                            }
                                            onDragEnd={endDragging}
                                            className={cn(
                                                'grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-2 transition-colors',
                                                isActive
                                                    ? 'bg-muted/60'
                                                    : 'bg-background hover:bg-muted/30',
                                                isDragSource && 'opacity-50',
                                                isDropBefore &&
                                                    'shadow-[inset_0_2px_0_0_var(--primary)]',
                                                isDropAfter &&
                                                    'shadow-[inset_0_-2px_0_0_var(--primary)]',
                                            )}
                                        >
                                            <button
                                                type="button"
                                                draggable={
                                                    !isSavingCategoryOrder
                                                }
                                                onDragStart={(event) =>
                                                    startDraggingCategory(
                                                        event,
                                                        category.id,
                                                    )
                                                }
                                                className="flex size-8 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-background hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing disabled:cursor-wait disabled:opacity-50"
                                                disabled={isSavingCategoryOrder}
                                                title="Ubah urutan kategori"
                                                aria-label={`Ubah urutan ${category.name}`}
                                            >
                                                <GripVertical className="size-4" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setActiveCategoryId(
                                                        category.id,
                                                    )
                                                }
                                                className="min-w-0 rounded-md px-2 py-1.5 text-left transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            >
                                                <span className="block truncate font-medium">
                                                    {category.name}
                                                </span>
                                                <span className="mt-0.5 block text-xs text-muted-foreground">
                                                    {productCount(
                                                        category.products_count,
                                                    )}
                                                </span>
                                            </button>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    asChild
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Edit kategori"
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
                                                <DeleteCategoryDialog
                                                    category={category}
                                                    onDelete={deleteCategory}
                                                />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="flex min-h-52 flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center text-muted-foreground">
                                <Tags className="size-8" />
                                <span>Belum ada kategori.</span>
                            </div>
                        )}
                    </aside>

                    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                        <div className="flex flex-col justify-between gap-3 border-b px-4 py-3 sm:flex-row sm:items-center">
                            <div className="min-w-0">
                                <h2 className="truncate font-semibold">
                                    {selectedCategory
                                        ? selectedCategory.name
                                        : 'Produk'}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {selectedCategory
                                        ? productCount(activeProducts.length)
                                        : 'Pilih kategori'}
                                </p>
                            </div>

                            {categories.length > 0 ? (
                                <Button asChild>
                                    <Link href={newProduct()}>
                                        <Plus />
                                        Produk
                                    </Link>
                                </Button>
                            ) : (
                                <Button type="button" disabled>
                                    <Plus />
                                    Produk
                                </Button>
                            )}
                        </div>

                        {selectedCategoryId === null ? (
                            <div className="flex flex-1 items-center justify-center px-4 py-16 text-center text-muted-foreground">
                                Buat kategori dulu sebelum menambahkan produk.
                            </div>
                        ) : activeProducts.length > 0 ? (
                            <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
                                {activeProducts.map((product) => {
                                    const isDragSource =
                                        draggedProductId === product.id;
                                    const isDropBefore =
                                        productDropTarget?.id === product.id &&
                                        productDropTarget.placement ===
                                            'before' &&
                                        !isDragSource;
                                    const isDropAfter =
                                        productDropTarget?.id === product.id &&
                                        productDropTarget.placement ===
                                            'after' &&
                                        !isDragSource;

                                    return (
                                        <li
                                            key={product.id}
                                            onDragOver={(event) =>
                                                markProductDropTarget(
                                                    event,
                                                    product.id,
                                                )
                                            }
                                            onDrop={(event) =>
                                                dropProduct(event, product.id)
                                            }
                                            onDragEnd={endDragging}
                                            className={cn(
                                                'grid grid-cols-[auto_3rem_1fr] gap-3 bg-background px-3 py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[auto_3.5rem_1fr_auto]',
                                                isDragSource && 'opacity-50',
                                                isDropBefore &&
                                                    'shadow-[inset_0_2px_0_0_var(--primary)]',
                                                isDropAfter &&
                                                    'shadow-[inset_0_-2px_0_0_var(--primary)]',
                                            )}
                                        >
                                            <button
                                                type="button"
                                                draggable={
                                                    !isSavingProductOrder
                                                }
                                                onDragStart={(event) =>
                                                    startDraggingProduct(
                                                        event,
                                                        product.id,
                                                    )
                                                }
                                                className="mt-1 flex size-8 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing disabled:cursor-wait disabled:opacity-50"
                                                disabled={isSavingProductOrder}
                                                title="Ubah urutan produk"
                                                aria-label={`Ubah urutan ${product.name}`}
                                            >
                                                <GripVertical className="size-4" />
                                            </button>

                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="size-12 rounded-md border object-cover sm:size-14"
                                                />
                                            ) : (
                                                <div className="flex size-12 items-center justify-center rounded-md border bg-primary/10 px-1 text-sm font-semibold text-primary sm:size-14 sm:text-base">
                                                    {getInitials(product.name)}
                                                </div>
                                            )}

                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="truncate font-medium">
                                                        {product.name}
                                                    </span>
                                                    <Badge
                                                        variant={
                                                            product.is_available
                                                                ? 'secondary'
                                                                : 'outline'
                                                        }
                                                    >
                                                        {product.is_available
                                                            ? 'Tersedia'
                                                            : 'Tidak tersedia'}
                                                    </Badge>
                                                </div>
                                                {product.description && (
                                                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                                        {product.description}
                                                    </p>
                                                )}
                                                <div className="mt-2 text-sm font-medium">
                                                    {formatRupiah(
                                                        product.price,
                                                    )}
                                                </div>
                                            </div>

                                            <div className="col-span-3 flex items-center justify-end gap-2 sm:col-span-1">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        toggleProduct(product)
                                                    }
                                                    title={
                                                        product.is_available
                                                            ? 'Tandai tidak tersedia'
                                                            : 'Tandai tersedia'
                                                    }
                                                    aria-label={
                                                        product.is_available
                                                            ? `Tandai ${product.name} tidak tersedia`
                                                            : `Tandai ${product.name} tersedia`
                                                    }
                                                >
                                                    {product.is_available ? (
                                                        <EyeOff />
                                                    ) : (
                                                        <Eye />
                                                    )}
                                                </Button>
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                    size="icon"
                                                    title="Edit produk"
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
                                                <DeleteProductDialog
                                                    product={product}
                                                    onDelete={deleteProduct}
                                                />
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="flex flex-1 items-center justify-center px-4 py-16 text-center text-muted-foreground">
                                Belum ada produk di kategori ini.
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Menu',
            href: productsIndex(),
        },
    ],
};
