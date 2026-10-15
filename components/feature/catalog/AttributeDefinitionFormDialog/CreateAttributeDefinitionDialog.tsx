"use client";

import { useState } from "react";
import useCreateAttributeDefinition from "@/data/feature/catalog/useCreateAttributeDefinition";
import type { ApiError } from "@/lib/api-error";
import type { AttributeDefinition } from "@/lib/types/catalog";
import AttributeDefinitionFormDialogUI, { type AttributeDefinitionFormValues } from "./index";

export interface CreateAttributeDefinitionDialogProps {
  onClose: () => void;
  onCreated?: (definition: AttributeDefinition) => void;
}

/**
 * Tier 2 injector: `POST /api/attributes/` (requires `attributes:create`).
 *
 * `unit`, `group` and `choices` are sent as `null`/`[]` rather than empty strings: the backend
 * rejects an empty-unit text attribute ("Only number attributes may define a unit") only when a
 * unit is actually present, and it forbids choices on non-choice types.
 */
export default function CreateAttributeDefinitionDialog({
  onClose,
  onCreated,
}: CreateAttributeDefinitionDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);
  const createDefinition = useCreateAttributeDefinition();

  const handleSubmit = (values: AttributeDefinitionFormValues) => {
    setError(null);

    createDefinition.mutate(
      {
        name: values.name,
        slug: values.slug,
        value_type: values.value_type,
        unit: values.unit || null,
        choices: values.choices,
        is_specification: values.is_specification,
        is_filterable: values.is_filterable,
        is_variant: values.is_variant,
        display_order: values.display_order,
        group: values.group || null,
      },
      {
        onSuccess: (definition) => {
          onCreated?.(definition);
          onClose();
        },
        onError: setError,
      },
    );
  };

  return (
    <AttributeDefinitionFormDialogUI
      mode="create"
      submitting={createDefinition.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
