"use client";

import { useState } from "react";
import useGetCategoryAttributes from "@/data/feature/catalog/useGetCategoryAttributes";
import useGetAttributeDefinitions from "@/data/feature/catalog/useGetAttributeDefinitions";
import useCreateCategoryAttribute from "@/data/feature/catalog/useCreateCategoryAttribute";
import useUpdateCategoryAttribute from "@/data/feature/catalog/useUpdateCategoryAttribute";
import useDeleteCategoryAttribute from "@/data/feature/catalog/useDeleteCategoryAttribute";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import type { ApiError } from "@/lib/api-error";
import {
  ATTRIBUTE_VALUE_TYPE_LABELS,
  type AttributeValueLevel,
  type Category,
} from "@/lib/types/catalog";
import CategoryAttributesPanelUI, { type AttributeLinkRow } from "./index";

export interface CategoryAttributesPanelProps {
  category: Category;
  /** Names of the other categories, used to label inherited links with their source. */
  categoryNames?: Record<string, string>;
  onClose: () => void;
}

/**
 * Tier 2 injector for the category ⇄ attribute links.
 *
 * `GET` is public and returns inherited links as well; the create/update/delete calls need
 * `category_attributes:create|update|delete`. Unlinking an attribute that products already use is
 * allowed by the backend — the UI only warns via the confirm-free "Unlink" button, and the publish
 * checklist stops demanding a value afterwards.
 */
export default function CategoryAttributesPanel({
  category,
  categoryNames = {},
  onClose,
}: CategoryAttributesPanelProps) {
  const { hasPermission, isSuperUser } = useAuth();
  const [busyLinkId, setBusyLinkId] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const { entries, isLoading } = useGetCategoryAttributes({ categoryId: category.id, page: 1, size: 100 });
  const { definitions } = useGetAttributeDefinitions({ page: 1, size: 100 });

  const createLink = useCreateCategoryAttribute();
  const updateLink = useUpdateCategoryAttribute();
  const deleteLink = useDeleteCategoryAttribute();

  const canAssign = isSuperUser || hasPermission(Permissions.CategoryAttributes_Create);
  const canUpdate = isSuperUser || hasPermission(Permissions.CategoryAttributes_Update);
  const canUnassign = isSuperUser || hasPermission(Permissions.CategoryAttributes_Delete);

  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  const linkedDefinitionIds = new Set(
    entries.map((entry) => entry.item.attribute_definition_id),
  );

  const rows: AttributeLinkRow[] = entries.map((entry) => {
    const definition = definitionById.get(entry.item.attribute_definition_id);

    return {
      id: entry.item.id,
      attributeDefinitionId: entry.item.attribute_definition_id,
      title: definition ? `${definition.name} (${definition.slug})` : entry.item.attribute_definition_id,
      valueTypeLabel: definition
        ? ATTRIBUTE_VALUE_TYPE_LABELS[definition.value_type]
        : "unknown type",
      valueLevel: entry.item.value_level,
      isRequired: entry.item.is_required,
      displayOrder: entry.item.display_order,
      group: entry.item.group,
      inherited: entry.inherited,
      sourceCategoryName: entry.inherited
        ? (categoryNames[entry.source_category_id] ?? entry.source_category_id)
        : null,
    };
  });

  const availableDefinitions = definitions
    .filter((definition) => !linkedDefinitionIds.has(definition.id))
    .map((definition) => ({
      id: definition.id,
      label: `${definition.name} — ${ATTRIBUTE_VALUE_TYPE_LABELS[definition.value_type]}${
        definition.group ? ` · ${definition.group}` : ""
      }`,
    }));

  const handleAdd: React.ComponentProps<typeof CategoryAttributesPanelUI>["callbacks"]["onAdd"] = (
    values,
  ) => {
    setError(null);
    setBusyLinkId("new");

    createLink.mutate(
      {
        categoryId: category.id,
        data: {
          attribute_definition_id: values.attributeDefinitionId,
          value_level: values.valueLevel as AttributeValueLevel,
          is_required: values.isRequired,
          display_order: values.displayOrder,
          group: values.group.trim() || null,
        },
      },
      { onError: setError, onSettled: () => setBusyLinkId(null) },
    );
  };

  const handleToggleRequired = (linkId: string, nextRequired: boolean) => {
    setError(null);
    setBusyLinkId(linkId);

    updateLink.mutate(
      { categoryId: category.id, itemId: linkId, data: { is_required: nextRequired } },
      { onError: setError, onSettled: () => setBusyLinkId(null) },
    );
  };

  const handleRemove = (linkId: string) => {
    setError(null);
    setBusyLinkId(linkId);

    deleteLink.mutate(
      { categoryId: category.id, itemId: linkId },
      { onError: setError, onSettled: () => setBusyLinkId(null) },
    );
  };

  return (
    <CategoryAttributesPanelUI
      categoryName={category.name}
      rows={isLoading ? [] : rows}
      availableDefinitions={availableDefinitions}
      busyLinkId={busyLinkId}
      canAssign={canAssign}
      canUpdate={canUpdate}
      canUnassign={canUnassign}
      errorMessage={error?.message ?? null}
      callbacks={{
        onAdd: handleAdd,
        onToggleRequired: handleToggleRequired,
        onRemove: handleRemove,
        onClose,
      }}
    />
  );
}
