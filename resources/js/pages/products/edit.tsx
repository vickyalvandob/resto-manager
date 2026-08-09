import { Head } from '@inertiajs/react';
import { ProductForm } from '@/pages/products/product-form';
import { index as productsIndex } from '@/routes/products';
import type { Category, Product } from '@/types';

type ProductsEditProps = {
    product: Product;
    categories: Category[];
};

export default function ProductsEdit({
    product,
    categories,
}: ProductsEditProps) {
    return (
        <>
            <Head title={`Edit ${product.name}`} />

            <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Edit Product</h1>
                    <p className="text-sm text-muted-foreground">
                        Update {product.name} details and availability.
                    </p>
                </div>

                <ProductForm
                    categories={categories}
                    product={product}
                    submitLabel="Save Product"
                />
            </div>
        </>
    );
}

ProductsEdit.layout = {
    breadcrumbs: [
        {
            title: 'Menu',
            href: productsIndex(),
        },
        {
            title: 'Edit Product',
            href: productsIndex(),
        },
    ],
};
