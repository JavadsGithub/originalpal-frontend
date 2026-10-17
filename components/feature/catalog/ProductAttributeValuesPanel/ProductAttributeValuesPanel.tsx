"use client";

import { useMemo, useState } from "react";
import useGetCategoryAttributes from "@/data/feature/catalog/useGetCategoryAttributes";
import useGetAttributeDefinitions from "@/data/feature/catalog/useGetAttributeDefinitions";
import useGetProductAttributeValues from "@/data/feature/catalog/useGetProductAttributeValues";
import useCreateProductAttributeValue from "@/data/feature/catalog/useCreateProductAttributeValue";
import useUpdateProductAttributeValue from "@/data/feature/catalog/useUpdateProductAttributeValue";
import useDeleteProductAttributeValue from "@/data/feature/catalog/useDeleteProductAttributeValue";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import type { ApiError } from "@/lib/api-error";
import type { Product } from "@/lib/types/catalog";
import {
  attributeValueToDraft,
  draftToAttributeValue,
  type AttributeValueDraft,
} from "@/components/feature/catalog/AttributeValueField/index";
import AttributeValueEditorUI, {
  type AttributeValueEditorRow,
} from "@/components/feature/catalog/AttributeValueEditor/index";

export interface ProductAttributeValuesPanelProps {
  product: Product;
  onClose: () => void;
}

/**
 * Tier 2 injector for the product-level values of the attributes its category declares.
 *
 * Every `product`- and `product_or_sku`-level link is offered here; `sku`-level links are left to
 * `SkuAttributeValuesDialog` and are shown as disabled rows so the admin can see the full picture.
 */
export default function ProductAttributeValuesPanel({
  product,
  onClose,
}: ProductAttributeValuesPanelProps) {
  const { hasPermission, isSuperUser } = useAuth();
  const [drafts, setDrafts] = useState<Record<string, AttributeValueDraft>>({});
  const [busyDefinitionId, setBusyDefinitionId] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const { entries } = useGetCategoryAttributes({
    categoryId: product.category_id,
    page: 1,
    size: 100,
  });
  const { definitions } = useGetAttributeDefinitions({ page: 1, size: 100 });
  const { values } = useGetProductAttributeValues({ productId: product.id, page: 1, size: 100 });

  const createValue = useCreateProductAttributeValue();
  const updateValue = useUpdateProductAttributeValue();
  const deleteValue = useDeleteProductAttributeValue();

  const canCreate = isSuperUser || hasPermission(Permissions.AttributeValues_Create);
  const canUpdate = isSuperUser || hasPermission(Permissions.AttributeValues_Update);
  const canDelete = isSuperUser || hasPermission(Permissions.AttributeValues_Delete);

  const definitionById = useMemo(
    () => new Map(definitions.map((definition) => [definition.id, definition])),
    [definitions],
  );
  const storedByDefinitionId = useMemo(
    () => new Map(values.map((value) => [value.attribute_definition_id, value])),
    [values],
  );

  const rows: AttributeValueEditorRow[] = entries.map((entry) => {
    const definition = definitionById.get(entry.item.attribute_definition_id);
    const stored = storedByDefinitionId.get(entry.item.attribute_definition_id);

    return {
      definition: definition ?? {
        id: entry.item.attribute_definition_id,
        name: entry.item.attribute_definition_id,
        slug: entry.item.attribute_definition_id,
        value_type: "text" as const,
        unit: null,
        choices: [],
      },
      valueLevel: entry.item.value_level,
      isRequired: entry.item.is_required,
      itemId: stored?.id ?? null,
      draft:
        drafts[entry.item.attribute_definition_id] ??
        (stored ? attributeValueToDraft(definition ?? { value_type: "text" }, stored.value) : ""),
    };
  });

  const handleSave = (definitionId: string) => {
    const definition = definitionById.get(definitionId);
    if (!definition) return;

    const value = draftToAttributeValue(definition, drafts[definitionId] ?? "");

    setError(null);
    setBusyDefinitionId(definitionId);

    if (value === undefined) {
      setError(
        new Error("Enter a value before saving — the API rejects a missing value.") as ApiError,
      );
      setBusyDefinitionId(null);
      return;
    }

    const stored = storedByDefinitionId.get(definitionId);
    const onSettled = () => setBusyDefinitionId(null);

    if (stored) {
      updateValue.mutate(
        { scope: { productId: product.id }, itemId: stored.id, data: { value } },
        { onError: setError, onSettled },
      );
      return;
    }

    createValue.mutate(
      { scope: { productId: product.id }, data: { attribute_definition_id: definitionId, value } },
      { onError: setError, onSettled },
    );
  };

  const handleDelete = (definitionId: string, itemId: string) => {
    setError(null);
    setBusyDefinitionId(definitionId);

    deleteValue.mutate(
      { scope: { productId: product.id }, itemId },
      {
        onSuccess: () => setDrafts((current) => ({ ...current, [definitionId]: "" })),
        onError: setError,
        onSettled: () => setBusyDefinitionId(null),
      },
    );
  };

  return (
    <AttributeValueEditorUI
      title={`Attribute values — ${product.title}`}
      description="Product-level values. Attributed marked `SKU` are filled in on each SKU instead."
      rows={rows}
      busyDefinitionId={busyDefinitionId}
      canCreate={canCreate}
      canUpdate={canUpdate}
      canDelete={canDelete}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      callbacks={{
        onChange: (definitionId, draft) =>
          setDrafts((current) => ({ ...current, [definitionId]: draft })),
        onSave: handleSave,
        onDelete: handleDelete,
        onClose,
      }}
    />
  );
}
