import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import type { FormEvent } from 'react';
import {
    store as storeProduct,
    update as updateProduct,
} from '@/actions/App/Http/Controllers/ProductController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { index as productsIndex } from '@/routes/products';
import type { Category, Product } from '@/types';

type ProductFormData = {
    name: string;
    category_id: string;
    description: string;
    price: string;
    sort_order: string;
    image: File | null;
    remove_image: boolean;
    is_available: boolean;
};

type ProductFormProps = {
    categories: Category[];
    product?: Product;
    submitLabel: string;
};

const emptyProductForm = (): ProductFormData => ({
    name: '',
    category_id: '',
    description: '',
    price: '',
    sort_order: '0',
    image: null,
    remove_image: false,
    is_available: true,
});

function formatPriceForInput(value: number): string {
    const amount = Number(value);

    return Number.isFinite(amount) ? String(amount) : '';
}

function productDefaults(product?: Product): ProductFormData {
    if (!product) {
        return emptyProductForm();
    }

    return {
        name: product.name,
        category_id: String(product.category_id),
        description: product.description ?? '',
        price: formatPriceForInput(product.price),
        sort_order: String(product.sort_order),
        image: null,
        remove_image: false,
        is_available: product.is_available,
    };
}

export function ProductForm({
    categories,
    product,
    submitLabel,
}: ProductFormProps) {
    const { data, setData, post, processing, progress, errors } =
        useForm<ProductFormData>(productDefaults(product));

    function submitProduct(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        const action = product
            ? updateProduct.form(product.id).action
            : storeProduct.form().action;

        post(action, {
            forceFormData: true,
            preserveScroll: true,
        });
    }

    return (
        <form
            onSubmit={submitProduct}
            className="overflow-hidden rounded-lg border border-sidebar-border/70 bg-background dark:border-sidebar-border"
        >
            <div className="grid gap-5 p-5 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="name">Product name</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(event) =>
                            setData('name', event.target.value)
                        }
                        required
                        autoComplete="off"
                        aria-invalid={Boolean(errors.name)}
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="category_id">Category</Label>
                    <select
                        id="category_id"
                        value={data.category_id}
                        onChange={(event) =>
                            setData('category_id', event.target.value)
                        }
                        required
                        aria-invalid={Boolean(errors.category_id)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.category_id} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                        id="price"
                        type="number"
                        min="0"
                        step="1"
                        value={data.price}
                        onChange={(event) =>
                            setData('price', event.target.value)
                        }
                        required
                        aria-invalid={Boolean(errors.price)}
                    />
                    <InputError message={errors.price} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="sort_order">Sort order</Label>
                    <Input
                        id="sort_order"
                        type="number"
                        min="0"
                        step="1"
                        value={data.sort_order}
                        onChange={(event) =>
                            setData('sort_order', event.target.value)
                        }
                        aria-invalid={Boolean(errors.sort_order)}
                    />
                    <InputError message={errors.sort_order} />
                </div>

                <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <textarea
                        id="description"
                        value={data.description}
                        onChange={(event) =>
                            setData('description', event.target.value)
                        }
                        rows={4}
                        aria-invalid={Boolean(errors.description)}
                        className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <InputError message={errors.description} />
                </div>

                <div className="grid gap-3 md:col-span-2">
                    <Label htmlFor="image">Image</Label>
                    <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-input bg-muted/20 px-4 py-6 text-center transition-colors hover:bg-muted/40">
                        <Upload className="size-5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                            {data.image ? data.image.name : 'Choose image'}
                        </span>
                        <Input
                            id="image"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) =>
                                setData(
                                    'image',
                                    event.target.files?.[0] ?? null,
                                )
                            }
                            aria-invalid={Boolean(errors.image)}
                            className="sr-only"
                        />
                    </label>
                    {product?.image_url && !data.remove_image && (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="size-24 rounded-md border object-cover"
                        />
                    )}
                    <InputError message={errors.image} />
                </div>
            </div>

            <div className="flex flex-col gap-4 border-t bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={data.is_available}
                            onCheckedChange={(checked) =>
                                setData('is_available', checked === true)
                            }
                        />
                        Tersedia
                    </label>

                    {product?.image_url && (
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Checkbox
                                checked={data.remove_image}
                                onCheckedChange={(checked) =>
                                    setData('remove_image', checked === true)
                                }
                            />
                            Remove image
                        </label>
                    )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {progress && (
                        <progress
                            value={progress.percentage}
                            max="100"
                            className="h-2 w-full sm:w-32"
                        >
                            {progress.percentage}%
                        </progress>
                    )}

                    <Button variant="outline" asChild>
                        <Link href={productsIndex()}>
                            <ArrowLeft />
                            Back
                        </Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        <Save />
                        {processing ? 'Saving...' : submitLabel}
                    </Button>
                </div>
            </div>
        </form>
    );
}
