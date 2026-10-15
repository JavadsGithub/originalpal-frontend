"use client";

import { useMemo, useState } from "react";
import useGetCategories from "@/data/feature/catalog/useGetCategories";
import useDeleteCategory from "@/data/feature/catalog/useDeleteCategory";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import type { ApiError } from "@/lib/api-error";
import type { Category } from "@/lib/types/catalog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/form-error";
import CreateCategoryDialog from "@/components/feature/catalog/CategoryFormDialog/CreateCategoryDialog";
import EditCategoryDialog from "@/components/feature/catalog/CategoryFormDialog/EditCategoryDialog";
import CategoryAttributesPanel from "@/components/feature/catalog/CategoryAttributesPanel/CategoryAttributesPanel";
import CategoriesTableUI, { type CategoryRowData } from "./index";
import CategoriesTableLoading from "./loading";
import CategoriesTableError from "./error";

export interface FlatCategory extends Category {
  depth: number;
  path: string;
}

/**
 * Flattens the category tree depth-first so a table can render it with indentation.
 * Categories whose parent is missing (or that would loop) fall back to the root level.
 */
export function flattenCategories(categories: Category[]): FlatCategory[] {
  const byParent = new Map<string | null, Category[]>();
  const ids = new Set(categories.map((category) => category.id));

  for (const category of categories) {
    const parentId = category.parent_id && ids.has(category.parent_id) ? category.parent_id : null;
    byParent.set(parentId, [...(byParent.get(parentId) ?? []), category]);
  }

  const flat: FlatCategory[] = [];
  const seen = new Set<string>();

  const walk = (parentId: string | null, depth: number, prefix: string) => {
    for (const category of byParent.get(parentId) ?? []) {
      if (seen.has(category.id)) continue;
      seen.add(category.id);

      const path = `${prefix}${category.name}`;
      flat.push({ ...category, depth, path });
      walk(category.id, depth + 1, `${path} / `);
    }
  };

  walk(null, 0, "");

  // Anything unreachable (a cycle) still shows up, at root level.
  for (const category of categories) {
    if (!seen.has(category.id)) flat.push({ ...category, depth: 0, path: category.name });
  }

  return flat;
}

/**
 * Tier 2 injector for the category tree.
 *
 * Reads are public (`GET /api/categories/`), so the screen is open to any signed-in admin and only
 * the mutations are gated: `categories:create|update|delete`, `category_attributes:create|delete`.
 */
export default function AdminCategoriesTable() {
  const { hasPermission, isSuperUser } = useAuth();

  const [dialog, setDialog] = useState<
    | { kind: "none" }
    | { kind: "create"; parentId: string | null }
    | { kind: "edit"; category: Category }
    | { kind: "attributes"; category: Category }
    | { kind: "delete"; category: Category }
  >({ kind: "none" });
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  const { categories, total, isLoading, isError, error, refetch } = useGetCategories({
    page: 1,
    size: 100,
  });
  const deleteCategory = useDeleteCategory();

  const canCreate = isSuperUser || hasPermission(Permissions.Categories_Create);
  const canUpdate = isSuperUser || hasPermission(Permissions.Categories_Update);
  const canDelete = isSuperUser || hasPermission(Permissions.Categories_Delete);
  const canManageAttributes =
    isSuperUser || hasPermission(Permissions.CategoryAttributes_Create);

  const flat = useMemo(() => flattenCategories(categories), [categories]);

  const rows: CategoryRowData[] = flat.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    parentId: category.parent_id,
    path: category.path,
    depth: category.depth,
  }));

  const handleDelete = (category: Category) => {
    setActionError(null);
    setBusyCategoryId(category.id);

    deleteCategory.mutate(category.id, {
      onSuccess: () => setDialog({ kind: "none" }),
      onError: setActionError,
      onSettled: () => setBusyCategoryId(null),
    });
  };

  if (isLoading) return <CategoriesTableLoading />;

  if (isError) {
    return (
      <CategoriesTableError
        message={error?.message ?? "Failed to load categories"}
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {actionError && (
          <FormError message={actionError.message} data-testid="categories-action-error" />
        )}

        <CategoriesTableUI
          categories={rows}
          total={total}
          busyCategoryId={busyCategoryId}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canManageAttributes={canManageAttributes}
          callbacks={{
            onCreate: () => setDialog({ kind: "create", parentId: null }),
            onAddChild: (categoryId) => setDialog({ kind: "create", parentId: categoryId }),
            onEdit: (categoryId) => {
              const category = categories.find((item) => item.id === categoryId);
              if (category) setDialog({ kind: "edit", category });
            },
            onManageAttributes: (categoryId) => {
              const category = categories.find((item) => item.id === categoryId);
              if (category) setDialog({ kind: "attributes", category });
            },
            onDelete: (categoryId) => {
              const category = categories.find((item) => item.id === categoryId);
              if (category) setDialog({ kind: "delete", category });
            },
          }}
        />
      </div>

      {dialog.kind === "create" && (
        <CreateCategoryDialog
          parentId={dialog.parentId}
          categories={flat.map((entry) => ({ id: entry.id, label: entry.path }))}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}

      {dialog.kind === "edit" && (
        <EditCategoryDialog
          category={dialog.category}
          categories={flat.map((entry) => ({
            id: entry.id,
            label: entry.path,
            parentId: entry.parent_id,
          }))}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}

      {dialog.kind === "attributes" && (
        <CategoryAttributesPanel
          category={dialog.category}
          categoryNames={Object.fromEntries(flat.map((entry) => [entry.id, entry.name]))}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}

      {dialog.kind === "delete" && (
        <ConfirmDialog
          open
          destructive
          busy={busyCategoryId === dialog.category.id}
          title={`Delete ${dialog.category.name}?`}
          description="Refused by the backend while the category still has children or products."
          translations={{ confirmButtonText: "Delete category" }}
          callbacks={{
            onConfirm: () => handleDelete(dialog.category),
            onCancel: () => setDialog({ kind: "none" }),
          }}
        />
      )}
    </>
  );
}

