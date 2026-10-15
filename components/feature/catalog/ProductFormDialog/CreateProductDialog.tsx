"use client";

import { useState } from "react";
import useCreateProduct from "@/data/feature/catalog/useCreateProduct";
import useGetCategories from "@/data/feature/catalog/useGetCategories";
import useGetBrands from "@/data/feature/catalog/useGetBrands";
import type { ApiError } from "@/lib/api-error";
import type { Product } from "@/lib/types/catalog";
import ProductFormDialogUI, { type ProductFormValues } from "./index";

export interface CreateProductDialogProps {
  onClose: () => void;
  onCreated?: (product: Product) => void;
}

/**
 * Tier 2 injector: `POST /api/products/` (requires `products:create`).
 *
 * The category/brand selects come from the same public list endpoints the rest of the screens use.
 * A brand that was deactivated in the meantime is marked in the option label because the backend
 * answers `422 VALIDATION_ERROR` (field `brand_id`) for it.
 */
export default function CreateProductDialog({ onClose, onCreated }: CreateProductDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);

  const { categories } = useGetCategories({ page: 1, size: 100 });
  const { brands } = useGetBrands({ page: 1, size: 100 });
  const createProduct = useCreateProduct();

  const handleSubmit = (values: ProductFormValues) => {
    setError(null);

    createProduct.mutate(
      {
        title: values.title,
        slug: values.slug,
        category_id: values.category_id,
        brand_id: values.brand_id || null,
        summary: values.summary || null,
        description: values.description || null,
        highlights: values.highlights,
        gallery: values.gallery,
      },
      {
        onSuccess: (product) => {
          onCreated?.(product);
          onClose();
        },
        onError: setError,
      },
    );
  };

  return (
    <ProductFormDialogUI
      mode="create"
      categories={categories.map((category) => ({ id: category.id, label: category.name }))}
      brands={brands.map((brand) => ({
        id: brand.id,
        label: brand.is_active ? brand.name : `${brand.name} (inactive)`,
      }))}
      submitting={createProduct.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
