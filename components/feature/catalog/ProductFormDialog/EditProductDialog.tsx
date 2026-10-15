"use client";

import { useState } from "react";
import useUpdateProduct from "@/data/feature/catalog/useUpdateProduct";
import useGetCategories from "@/data/feature/catalog/useGetCategories";
import useGetBrands from "@/data/feature/catalog/useGetBrands";
import type { ApiError } from "@/lib/api-error";
import type { Product, ProductUpdateRequest } from "@/lib/types/catalog";
import ProductFormDialogUI, { type ProductFormValues } from "./index";

export interface EditProductDialogProps {
  product: Product;
  onClose: () => void;
  onSaved?: (product: Product) => void;
}

/**
 * Tier 2 injector: `PUT /api/products/{id}` (requires `products:update`).
 *
 * Diffs against the loaded product: the update endpoint is partial, and the fields the backend
 * refuses to null (`title`, `slug`, `category_id`, `highlights`, `gallery`) must simply be omitted
 * when unchanged. Clearing the brand *is* allowed — it is sent as `brand_id: null`.
 */
export default function EditProductDialog({
  product,
  onClose,
  onSaved,
}: EditProductDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);

  const { categories } = useGetCategories({ page: 1, size: 100 });
  const { brands } = useGetBrands({ page: 1, size: 100 });
  const updateProduct = useUpdateProduct();

  const handleSubmit = (values: ProductFormValues) => {
    setError(null);

    const data: ProductUpdateRequest = {};
    if (values.title !== product.title) data.title = values.title;
    if (values.slug !== product.slug) data.slug = values.slug;
    if (values.category_id !== product.category_id) data.category_id = values.category_id;
    if ((values.brand_id || null) !== (product.brand_id ?? null)) {
      data.brand_id = values.brand_id || null;
    }
    if ((values.summary || null) !== (product.summary ?? null)) {
      data.summary = values.summary || null;
    }
    if ((values.description || null) !== (product.description ?? null)) {
      data.description = values.description || null;
    }
    if (values.highlights.join("\u0000") !== product.highlights.join("\u0000")) {
      data.highlights = values.highlights;
    }
    if (values.gallery.join("\u0000") !== product.gallery.join("\u0000")) {
      data.gallery = values.gallery;
    }

    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }

    updateProduct.mutate(
      { productId: product.id, data },
      {
        onSuccess: (updated) => {
          onSaved?.(updated);
          onClose();
        },
        onError: setError,
      },
    );
  };

  return (
    <ProductFormDialogUI
      mode="edit"
      initialValues={{
        title: product.title,
        slug: product.slug,
        category_id: product.category_id,
        brand_id: product.brand_id ?? "",
        summary: product.summary ?? "",
        description: product.description ?? "",
        highlights: product.highlights,
        gallery: product.gallery,
      }}
      categories={categories.map((category) => ({ id: category.id, label: category.name }))}
      brands={brands.map((brand) => ({
        id: brand.id,
        label: brand.is_active ? brand.name : `${brand.name} (inactive)`,
      }))}
      submitting={updateProduct.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
