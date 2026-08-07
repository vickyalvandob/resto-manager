import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    GripVertical,
    LoaderCircle,
    Pencil,
    Plus,
    Tags,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { DragEvent } from 'react';
import {
    destroy as destroyCategory,
    edit as editCategory,
    create as newCategory,
    reorder as reorderCategories,
} from '@/actions/App/Http/Controllers/CategoryController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { index as categoriesIndex } from '@/routes/categories';
import type { CategoryWithProductCount } from '@/types';

type CategoriesIndexProps = {
    categories: CategoryWithProductCount[];
};

type DropPlacement = 'before' | 'after';

type DropTarget = {
    id: number;
    placement: DropPlacement;
};

function formatProductsCount(count: number): string {
    return `${count} product${count === 1 ? '' : 's'}`;
}

function categoryIds(categories: CategoryWithProductCount[]): number[] {
    return categories.map((category) => category.id);
}

function hasSameOrder(
    currentCategories: CategoryWithProductCount[],
    nextCategories: CategoryWithProductCount[],
): boolean {
    return (
        categoryIds(currentCategories).join(',') ===
        categoryIds(nextCategories).join(',')
    );
}

function moveCategory(
    categories: CategoryWithProductCount[],
    draggedCategoryId: number,
    targetCategoryId: number,
    placement: DropPlacement,
): CategoryWithProductCount[] {
    if (draggedCategoryId === targetCategoryId) {
        return categories;
    }

    const draggedCategory = categories.find(
        (category) => category.id === draggedCategoryId,
    );

    if (!draggedCategory) {
        return categories;
    }

    const remainingCategories = categories.filter(
        (category) => category.id !== draggedCategoryId,
    );
    const targetIndex = remainingCategories.findIndex(
        (category) => category.id === targetCategoryId,
    );

    if (targetIndex === -1) {
        return categories;
    }

    const insertIndex = placement === 'after' ? targetIndex + 1 : targetIndex;
    const nextCategories = [...remainingCategories];

    nextCategories.splice(insertIndex, 0, draggedCategory);

    return nextCategories;
}

export default function CategoriesIndex({ categories }: CategoriesIndexProps) {
    const [localCategoryIds, setLocalCategoryIds] = useState(() =>
        categoryIds(categories),
    );
    const [draggedCategoryId, setDraggedCategoryId] = useState<number | null>(
        null,
    );
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    const categoriesById = new Map(
        categories.map((category) => [category.id, category]),
    );
    const hasValidLocalOrder =
        localCategoryIds.length === categories.length &&
        localCategoryIds.every((categoryId) => categoriesById.has(categoryId));
    const orderedCategories = hasValidLocalOrder
        ? localCategoryIds.map(
              (categoryId) =>
                  categoriesById.get(categoryId) as CategoryWithProductCount,
          )
        : categories;

    function saveCategoryOrder(
        nextCategories: CategoryWithProductCount[],
    ): void {
        if (hasSameOrder(orderedCategories, nextCategories)) {
            return;
        }

        setLocalCategoryIds(categoryIds(nextCategories));
        setIsSavingOrder(true);

        router.put(
            reorderCategories(),
            {
                categories: categoryIds(nextCategories),
            },
            {
                preserveScroll: true,
                onError: () => setLocalCategoryIds(categoryIds(categories)),
                onFinish: () => setIsSavingOrder(false),
            },
        );
    }

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

    function startDragging(
        event: DragEvent<HTMLButtonElement>,
        categoryId: number,
    ): void {
        if (isSavingOrder) {
            event.preventDefault();

            return;
        }

        setDraggedCategoryId(categoryId);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(categoryId));
    }

    function markDropTarget(
        event: DragEvent<HTMLLIElement>,
        categoryId: number,
    ): void {
        if (draggedCategoryId === null || draggedCategoryId === categoryId) {
            return;
        }

        event.preventDefault();

        const bounds = event.currentTarget.getBoundingClientRect();
        const placement =
            event.clientY > bounds.top + bounds.height / 2 ? 'after' : 'before';

        event.dataTransfer.dropEffect = 'move';
        setDropTarget({ id: categoryId, placement });
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
            dropTarget?.id === categoryId ? dropTarget.placement : 'before';
        const nextCategories = moveCategory(
            orderedCategories,
            draggedCategoryId,
            categoryId,
            placement,
        );

        setDraggedCategoryId(null);
        setDropTarget(null);
        saveCategoryOrder(nextCategories);
    }

    function endDragging(): void {
        setDraggedCategoryId(null);
        setDropTarget(null);
    }

    function moveCategoryByOffset(categoryId: number, offset: number): void {
        const currentIndex = orderedCategories.findIndex(
            (category) => category.id === categoryId,
        );
        const targetIndex = currentIndex + offset;

        if (
            currentIndex === -1 ||
            targetIndex < 0 ||
            targetIndex >= orderedCategories.length
        ) {
            return;
        }

        const nextCategories = [...orderedCategories];
        const [movedCategory] = nextCategories.splice(currentIndex, 1);

        nextCategories.splice(targetIndex, 0, movedCategory);
        saveCategoryOrder(nextCategories);
    }

    return (
        <>
            <Head title="Categories" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="grid gap-1">
                        <h1 className="text-2xl font-semibold">Categories</h1>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <span>
                                {orderedCategories.length} categor
                                {orderedCategories.length === 1 ? 'y' : 'ies'}
                            </span>
                            {isSavingOrder && (
                                <span className="inline-flex items-center gap-1.5">
                                    <LoaderCircle className="size-3.5 animate-spin" />
                                    Saving order
                                </span>
                            )}
                        </div>
                    </div>

                    <Button asChild>
                        <Link href={newCategory()}>
                            <Plus />
                            New Category
                        </Link>
                    </Button>
                </div>

                <div className="overflow-hidden rounded-lg border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                    {orderedCategories.length > 0 ? (
                        <ul className="divide-y">
                            {orderedCategories.map((category, index) => {
                                const isDragSource =
                                    draggedCategoryId === category.id;
                                const isDropBefore =
                                    dropTarget?.id === category.id &&
                                    dropTarget.placement === 'before' &&
                                    !isDragSource;
                                const isDropAfter =
                                    dropTarget?.id === category.id &&
                                    dropTarget.placement === 'after' &&
                                    !isDragSource;

                                return (
                                    <li
                                        key={category.id}
                                        onDragOver={(event) =>
                                            markDropTarget(event, category.id)
                                        }
                                        onDrop={(event) =>
                                            dropCategory(event, category.id)
                                        }
                                        onDragEnd={endDragging}
                                        className={cn(
                                            'grid min-h-20 grid-cols-[auto_1fr] items-center gap-3 bg-background px-3 py-3 transition-colors hover:bg-muted/30 sm:grid-cols-[auto_1fr_auto] sm:px-4',
                                            isDragSource && 'opacity-50',
                                            isDropBefore &&
                                                'shadow-[inset_0_2px_0_0_var(--primary)]',
                                            isDropAfter &&
                                                'shadow-[inset_0_-2px_0_0_var(--primary)]',
                                            isSavingOrder &&
                                                'cursor-wait opacity-80',
                                        )}
                                    >
                                        <button
                                            type="button"
                                            draggable={!isSavingOrder}
                                            onDragStart={(event) =>
                                                startDragging(
                                                    event,
                                                    category.id,
                                                )
                                            }
                                            className="flex size-9 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:cursor-grabbing disabled:cursor-wait disabled:opacity-50"
                                            disabled={isSavingOrder}
                                            title="Reorder category"
                                            aria-label={`Reorder ${category.name}`}
                                        >
                                            <GripVertical className="size-4" />
                                        </button>

                                        <div className="min-w-0">
                                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                <span className="truncate font-medium">
                                                    {category.name}
                                                </span>
                                                <Badge variant="secondary">
                                                    {formatProductsCount(
                                                        category.products_count,
                                                    )}
                                                </Badge>
                                            </div>
                                            {category.description && (
                                                <p className="mt-1 truncate text-sm text-muted-foreground">
                                                    {category.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="col-span-2 flex justify-end gap-2 sm:col-span-1">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                disabled={
                                                    isSavingOrder || index === 0
                                                }
                                                onClick={() =>
                                                    moveCategoryByOffset(
                                                        category.id,
                                                        -1,
                                                    )
                                                }
                                                title="Move category up"
                                                aria-label={`Move ${category.name} up`}
                                            >
                                                <ArrowUp />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                disabled={
                                                    isSavingOrder ||
                                                    index ===
                                                        orderedCategories.length -
                                                            1
                                                }
                                                onClick={() =>
                                                    moveCategoryByOffset(
                                                        category.id,
                                                        1,
                                                    )
                                                }
                                                title="Move category down"
                                                aria-label={`Move ${category.name} down`}
                                            >
                                                <ArrowDown />
                                            </Button>
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
                                                    deleteCategory(category)
                                                }
                                                title="Delete category"
                                                aria-label={`Delete ${category.name}`}
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="flex min-h-52 flex-col items-center justify-center gap-2 px-4 py-16 text-center text-muted-foreground">
                            <Tags className="size-8" />
                            <span>No categories yet.</span>
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
