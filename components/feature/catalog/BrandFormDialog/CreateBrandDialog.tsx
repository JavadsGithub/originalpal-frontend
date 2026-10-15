"use client";

import { useState } from "react";
import useCreateBrand from "@/data/feature/catalog/useCreateBrand";
import type { ApiError } from "@/lib/api-error";
import type { Brand } from "@/lib/types/catalog";
import BrandFormDialogUI, { type BrandFormValues } from "./index";

export interface CreateBrandDialogProps {
  onClose: () => void;
  onCreated?: (brand: Brand) => void;
}

/** Tier 2 injector: `POST /api/brands/` (requires `brands:create`). */
export default function CreateBrandDialog({ onClose, onCreated }: CreateBrandDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);
  const createBrand = useCreateBrand();

  const handleSubmit = (values: BrandFormValues) => {
    setError(null);

    createBrand.mutate(
      {
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        is_active: values.is_active,
      },
      {
        onSuccess: (brand) => {
          onCreated?.(brand);
          onClose();
        },
        onError: setError,
      },
    );
  };

  return (
    <BrandFormDialogUI
      mode="create"
      submitting={createBrand.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
