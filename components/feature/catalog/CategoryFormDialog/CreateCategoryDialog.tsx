"use client";

import { useState } from "react";
import useCreateCategory from "@/data/feature/catalog/useCreateCategory";
import type { ApiError } from "@/lib/api-error";
import type { Category } from "@/lib/types/catalog";
import CategoryFormDialogUI, { type CategoryFormValues } from "./index";

export interface CreateCategoryDialogProps {
  parentId: string | null;
  /** Flat list used to build the parent selector. */
  categories: Array<{ id: string; label: string }>;
  onClose: () => void;
  onCreated?: (category: Category) => void;
}

/**
 * Tier 2 injector: `POST /api/categories/`.
 *
 * A duplicate slug (or a parent that vanished in the meantime) answers `409 CONFLICT`, which is
 * shown as the form error instead of being pre-validated client-side.
 */
export default function CreateCategoryDialog({
  parentId,
  categories,
  onClose,
  onCreated,
}: CreateCategoryDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);
  const createCategory = useCreateCategory();

  const handleSubmit = (values: CategoryFormValues) => {
    setError(null);

    createCategory.mutate(
      {
        name: values.name,
        slug: values.slug,
        parent_id: values.parentId || null,
      },
      {
        onSuccess: (category) => {
          onCreated?.(category);
          onClose();
        },
        onError: setError,
      },
    );
  };

  return (
    <CategoryFormDialogUI
      mode="create"
      initialValues={{ parentId: parentId ?? "" }}
      parents={categories.map((category) => ({ id: category.id, label: category.label }))}
      submitting={createCategory.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
