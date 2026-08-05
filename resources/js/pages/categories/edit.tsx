import { Head } from '@inertiajs/react';
import { CategoryForm } from '@/pages/categories/category-form';
import { index as categoriesIndex } from '@/routes/categories';
import type { CategoryWithProductCount } from '@/types';

type CategoriesEditProps = {
    category: CategoryWithProductCount;
};

export default function CategoriesEdit({ category }: CategoriesEditProps) {
    return (
        <>
            <Head title={`Edit ${category.name}`} />

            <div className="mx-auto flex h-full w-full max-w-2xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Edit Category</h1>
                    <p className="text-sm text-muted-foreground">
                        Update {category.name} details.
                    </p>
                </div>

                <CategoryForm category={category} submitLabel="Save Category" />
            </div>
        </>
    );
}

CategoriesEdit.layout = {
    breadcrumbs: [
        {
            title: 'Categories',
            href: categoriesIndex(),
        },
        {
            title: 'Edit Category',
            href: categoriesIndex(),
        },
    ],
};
