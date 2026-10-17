"use client";

import { useMemo, useState } from "react";
import useGetCategoryAttributes from "@/data/feature/catalog/useGetCategoryAttributes";
import useGetAttributeDefinitions from "@/data/feature/catalog/useGetAttributeDefinitions";
import useGetSkuAttributeValues from "@/data/feature/catalog/useGetSkuAttributeValues";
import useCreateSkuAttributeValue from "@/data/feature/catalog/useCreateSkuAttributeValue";
import useUpdateSkuAttributeValue from "@/data/feature/catalog/useUpdateSkuAttributeValue";
import useDeleteSkuAttributeValue from "@/data/feature/catalog/useDeleteSkuAttributeValue";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import { toApiError, type ApiError } from "@/lib/api-error";
import type { Sku } from "@/lib/types/catalog";
import {
  attributeValueToDraft,
  draftToAttributeValue,
  type AttributeValueDraft,
} from "@/components/feature/catalog/AttributeValueField/index";
import AttributeValueEditorUI, {
  type AttributeValueEditorRow,
} from "@/components/feature/catalog/AttributeValueEditor/index";

export interface SkuAttributeValuesDialogProps {
  productId: string;
  sku: Sku;
  /** Needed to resolve which category's attributes apply. */
  categoryId: string;
  onClose: () => void;
}

/**
 * Tier 2 injector for the SKU-level values of the attributes its category demands.
 *
 * Only links with `value_level` `sku` or `product_or_sku` are offered: a `product`-level attribute
 * is answered by the product itself. `product_or_sku` values are stored *on the SKU* here, which is
 * exactly how `PublishProductUseCase._ensure_required_value` checks for them.
 */
export default function SkuAttributeValuesDialog({
  productId,
  sku,
  categoryId,
  onClose,
}: SkuAttributeValuesDialogProps) {
  const { hasPermission, isSuperUser } = useAuth();
  const [drafts, setDrafts] = useState<Record<string, AttributeValueDraft>>({});
  const [busyDefinitionId, setBusyDefinitionId] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const { entries } = useGetCategoryAttributes({ categoryId, page: 1, size: 100 });
  const { definitions } = useGetAttributeDefinitions({ page: 1, size: 100 });
  const { values } = useGetSkuAttributeValues({ productId, skuId: sku.id, page: 1, size: 100 });

  const createValue = useCreateSkuAttributeValue();
  const updateValue = useUpdateSkuAttributeValue();
  const deleteValue = useDeleteSkuAttributeValue();

  const canCreate = isSuperUser || hasPermission(Permissions.AttributeValues_Create);
  const canUpdate = isSuperUser || hasPermission(Permissions.AttributeValues_Update);
  const canDelete = isSuperUser || hasPermission(Permissions.AttributeValues_Delete);

  const definitionById = useMemo(
    () => new Map(definitions.map((definition) => [definition.id, definition])),
    [definitions],
  );
  const valueByDefinitionId = useMemo(
    () => new Map(values.map((value) => [value.attribute_definition_id, value])),
    [values],
  );

  const rows: AttributeValueEditorRow[] = entries
    .filter((entry) => entry.item.value_level !== "product")
    .map((entry) => {
      const definition = definitionById.get(entry.item.attribute_definition_id);
      const stored = valueByDefinitionId.get(entry.item.attribute_definition_id);

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
        // The editor state is *derived*: a local draft wins, otherwise the stored value is shown.
        draft:
          drafts[entry.item.attribute_definition_id] ??
          (stored ? attributeValueToDraft(definition ?? { value_type: "text" }, stored.value) : ""),
      };
    });

  const handleSave = (definitionId: string) => {
    const definition = definitionById.get(definitionId);
    if (!definition) return;

    const draft = drafts[definitionId] ?? "";
    const value = draftToAttributeValue(definition, draft);

    setError(null);
    setBusyDefinitionId(definitionId);

    if (value === undefined) {
      setError(
        toApiError(new Error("Enter a value before saving — the API rejects a missing value.")),
      );
      setBusyDefinitionId(null);
      return;
    }

    const stored = valueByDefinitionId.get(definitionId);
    const onSettled = () => setBusyDefinitionId(null);

    if (stored) {
      updateValue.mutate(
        { scope: { productId, skuId: sku.id }, itemId: stored.id, data: { value } },
        { onError: (mutationError) => setError(mutationError), onSettled },
      );
      return;
    }

    createValue.mutate(
      {
        scope: { productId, skuId: sku.id },
        data: { attribute_definition_id: definitionId, value },
      },
      { onError: (mutationError) => setError(mutationError), onSettled },
    );
  };

  const handleDelete = (definitionId: string, itemId: string) => {
    setError(null);
    setBusyDefinitionId(definitionId);

    deleteValue.mutate(
      { scope: { productId, skuId: sku.id }, itemId },
      {
        onSuccess: () => setDrafts((current) => ({ ...current, [definitionId]: "" })),
        onError: setError,
        onSettled: () => setBusyDefinitionId(null),
      },
    );
  };

  return (
    <AttributeValueEditorUI
      title={`SKU attribute values — ${sku.code}`}
      description="Values stored against this SKU. A `product`-level attribute is answered on the product instead."
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
