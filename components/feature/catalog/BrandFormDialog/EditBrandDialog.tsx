"use client";

import { useState } from "react";
import useUpdateBrand from "@/data/feature/catalog/useUpdateBrand";
import type { ApiError } from "@/lib/api-error";
import type { Brand } from "@/lib/types/catalog";
import BrandFormDialogUI, { type BrandFormValues } from "./index";

export interface EditBrandDialogProps {
  brand: Brand;
  onClose: () => void;
  onSaved?: (brand: Brand) => void;
}

/**
 * Tier 2 injector: `PUT /api/brands/{id}`.
 *
 * Only changed fields are sent. Clearing the description is expressed as `null` (allowed), while
 * `name`/`slug`/`is_active` can only be omitted, never nulled.
 */
export default function EditBrandDialog({ brand, onClose, onSaved }: EditBrandDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);
  const updateBrand = useUpdateBrand();

  const handleSubmit = (values: BrandFormValues) => {
    setError(null);

    const data: {
      name?: string;
      slug?: string;
      description?: string | null;
      is_active?: boolean;
    } = {};

    if (values.name !== brand.name) data.name = values.name;
    if (values.slug !== brand.slug) data.slug = values.slug;
    if (values.description !== (brand.description ?? "")) {
      data.description = values.description || null;
    }
    if (values.is_active !== brand.is_active) data.is_active = values.is_active;

    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }

    updateBrand.mutate(
      { brandId: brand.id, data },
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
    <BrandFormDialogUI
      mode="edit"
      initialValues={{
        name: brand.name,
        slug: brand.slug,
        description: brand.description ?? "",
        is_active: brand.is_active,
      }}
      submitting={updateBrand.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
