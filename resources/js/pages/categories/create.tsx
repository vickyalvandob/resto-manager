import { Head } from '@inertiajs/react';
import { CategoryForm } from '@/pages/categories/category-form';
import {
    create as newCategory,
    index as categoriesIndex,
} from '@/routes/categories';

export default function CategoriesCreate() {
    return (
        <>
            <Head title="New Category" />

            <div className="mx-auto flex h-full w-full max-w-2xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">New Category</h1>
                    <p className="text-sm text-muted-foreground">
                        Create a category for organizing products.
                    </p>
                </div>

                <CategoryForm submitLabel="Create Category" />
            </div>
        </>
    );
}

CategoriesCreate.layout = {
    breadcrumbs: [
        {
            title: 'Categories',
            href: categoriesIndex(),
        },
        {
            title: 'New Category',
            href: newCategory(),
        },
    ],
};
