"use client";

import { useState } from "react";
import useUpdateCategory from "@/data/feature/catalog/useUpdateCategory";
import type { ApiError } from "@/lib/api-error";
import type { Category } from "@/lib/types/catalog";
import CategoryFormDialogUI, { type CategoryFormValues } from "./index";

export interface EditCategoryDialogProps {
  category: Category;
  /** Flat list used to build the parent selector. */
  categories: Array<{ id: string; label: string; parentId: string | null }>;
  onClose: () => void;
  onSaved?: (category: Category) => void;
}

/**
 * Tier 2 injector: `PUT /api/categories/{id}`.
 *
 * The category itself and its descendants are excluded from the parent selector; the backend would
 * reject such a move anyway ("Category hierarchy cannot contain a cycle", field `parent_id`). Only
 * the fields that actually changed are sent, because the update endpoint is partial.
 */
export default function EditCategoryDialog({
  category,
  categories,
  onClose,
  onSaved,
}: EditCategoryDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);
  const updateCategory = useUpdateCategory();

  const descendantIds = collectDescendantIds(
    category.id,
    categories.map((entry) => ({ ...entry, id: entry.id, parentId: entry.parentId })),
  );

  const handleSubmit = (values: CategoryFormValues) => {
    setError(null);

    const data: { name?: string; slug?: string; parent_id?: string | null } = {};
    if (values.name !== category.name) data.name = values.name;
    if (values.slug !== category.slug) data.slug = values.slug;

    const nextParent = values.parentId || null;
    if (nextParent !== category.parent_id) data.parent_id = nextParent;

    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }

    updateCategory.mutate(
      { categoryId: category.id, data },
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
    <CategoryFormDialogUI
      mode="edit"
      initialValues={{
        name: category.name,
        slug: category.slug,
        parentId: category.parent_id ?? "",
      }}
      parents={categories.map((entry) => ({ id: entry.id, label: entry.label }))}
      disabledParentIds={[category.id, ...descendantIds]}
      submitting={updateCategory.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}

/** Walks the flat list upward-safe: returns every category that lives under `categoryId`. */
function collectDescendantIds(
  categoryId: string,
  categories: Array<{ id: string; parentId: string | null }>,
): string[] {
  const childrenOf = new Map<string | null, string[]>();
  for (const category of categories) {
    childrenOf.set(category.parentId, [...(childrenOf.get(category.parentId) ?? []), category.id]);
  }

  const descendants: string[] = [];
  const queue = [...(childrenOf.get(categoryId) ?? [])];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    if (descendants.includes(current)) continue;
    descendants.push(current);
    queue.push(...(childrenOf.get(current) ?? []));
  }

  return descendants;
}
