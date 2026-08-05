import { Head } from '@inertiajs/react';
import { ProductForm } from '@/pages/products/product-form';
import {
    create as newProduct,
    index as productsIndex,
} from '@/routes/products';
import type { Category } from '@/types';

type ProductsCreateProps = {
    categories: Category[];
};

export default function ProductsCreate({ categories }: ProductsCreateProps) {
    return (
        <>
            <Head title="New Product" />

            <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">New Product</h1>
                    <p className="text-sm text-muted-foreground">
                        Create a product for the menu catalog.
                    </p>
                </div>

                <ProductForm
                    categories={categories}
                    submitLabel="Create Product"
                />
            </div>
        </>
    );
}

ProductsCreate.layout = {
    breadcrumbs: [
        {
            title: 'Products',
            href: productsIndex(),
        },
        {
            title: 'New Product',
            href: newProduct(),
        },
    ],
};
