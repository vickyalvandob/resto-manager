import { Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';
import type { FormEvent } from 'react';
import {
    store as storeCategory,
    update as updateCategory,
} from '@/actions/App/Http/Controllers/CategoryController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { index as categoriesIndex } from '@/routes/categories';
import type { CategoryWithProductCount } from '@/types';

type CategoryFormData = {
    name: string;
    description: string;
};

type CategoryFormProps = {
    category?: CategoryWithProductCount;
    submitLabel: string;
};

function categoryDefaults(
    category?: CategoryWithProductCount,
): CategoryFormData {
    return {
        name: category?.name ?? '',
        description: category?.description ?? '',
    };
}

export function CategoryForm({ category, submitLabel }: CategoryFormProps) {
    const { data, setData, post, processing, errors } =
        useForm<CategoryFormData>(categoryDefaults(category));

    function submitCategory(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        const action = category
            ? updateCategory.form(category.id).action
            : storeCategory.form().action;

        post(action, {
            preserveScroll: true,
        });
    }

    return (
        <form
            onSubmit={submitCategory}
            className="overflow-hidden rounded-lg border border-sidebar-border/70 bg-background dark:border-sidebar-border"
        >
            <div className="grid gap-5 p-5">
                <div className="grid gap-2">
                    <Label htmlFor="name">Category name</Label>
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
            </div>

            <div className="flex flex-col gap-3 border-t bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
                <Button variant="outline" asChild>
                    <Link href={categoriesIndex()}>
                        <ArrowLeft />
                        Back
                    </Link>
                </Button>
                <Button type="submit" disabled={processing}>
                    <Save />
                    {processing ? 'Saving...' : submitLabel}
                </Button>
            </div>
        </form>
    );
}
