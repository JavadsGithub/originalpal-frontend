"use client";

import { useState } from "react";
import useUpdateAttributeDefinition from "@/data/feature/catalog/useUpdateAttributeDefinition";
import type { ApiError } from "@/lib/api-error";
import type { AttributeDefinitionUpdateRequest, AttributeDefinition } from "@/lib/types/catalog";
import AttributeDefinitionFormDialogUI, { type AttributeDefinitionFormValues } from "./index";

export interface EditAttributeDefinitionDialogProps {
  definition: AttributeDefinition;
  onClose: () => void;
  onSaved?: (definition: AttributeDefinition) => void;
}

/**
 * Tier 2 injector: `PUT /api/attributes/{id}` (requires `attributes:update`).
 *
 * Diffs the form against the loaded definition because the endpoint is partial: sending
 * `choices: []` to a choice attribute is a validation error, so untouched fields must stay out of
 * the payload entirely.
 */
export default function EditAttributeDefinitionDialog({
  definition,
  onClose,
  onSaved,
}: EditAttributeDefinitionDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);
  const updateDefinition = useUpdateAttributeDefinition();

  const handleSubmit = (values: AttributeDefinitionFormValues) => {
    setError(null);

    const data: AttributeDefinitionUpdateRequest = {};
    if (values.name !== definition.name) data.name = values.name;
    if (values.slug !== definition.slug) data.slug = values.slug;
    if (values.value_type !== definition.value_type) data.value_type = values.value_type;
    if ((values.unit || null) !== (definition.unit ?? null)) data.unit = values.unit || null;
    if (values.choices.join("\u0000") !== definition.choices.join("\u0000")) {
      data.choices = values.choices;
    }
    if (values.is_specification !== definition.is_specification) {
      data.is_specification = values.is_specification;
    }
    if (values.is_filterable !== definition.is_filterable) {
      data.is_filterable = values.is_filterable;
    }
    if (values.is_variant !== definition.is_variant) data.is_variant = values.is_variant;
    if (values.display_order !== definition.display_order) data.display_order = values.display_order;
    if ((values.group || null) !== (definition.group ?? null)) data.group = values.group || null;

    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }

    updateDefinition.mutate(
      { definitionId: definition.id, data },
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
    <AttributeDefinitionFormDialogUI
      mode="edit"
      initialValues={{
        name: definition.name,
        slug: definition.slug,
        value_type: definition.value_type,
        unit: definition.unit ?? "",
        choices: definition.choices,
        is_specification: definition.is_specification,
        is_filterable: definition.is_filterable,
        is_variant: definition.is_variant,
        display_order: definition.display_order,
        group: definition.group ?? "",
      }}
      submitting={updateDefinition.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
