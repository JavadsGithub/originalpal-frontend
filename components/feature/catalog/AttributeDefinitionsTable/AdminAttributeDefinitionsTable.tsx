"use client";

import { useState } from "react";
import useGetAttributeDefinitions from "@/data/feature/catalog/useGetAttributeDefinitions";
import useDeleteAttributeDefinition from "@/data/feature/catalog/useDeleteAttributeDefinition";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/api";
import type { ApiError } from "@/lib/api-error";
import {
  ATTRIBUTE_VALUE_TYPE_LABELS,
  type AttributeDefinition,
} from "@/lib/types/catalog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/form-error";
import CreateAttributeDefinitionDialog from "@/components/feature/catalog/AttributeDefinitionFormDialog/CreateAttributeDefinitionDialog";
import EditAttributeDefinitionDialog from "@/components/feature/catalog/AttributeDefinitionFormDialog/EditAttributeDefinitionDialog";
import AttributeDefinitionsTableUI, { type AttributeDefinitionRowData } from "./index";
import AttributeDefinitionsTableLoading from "./loading";
import AttributeDefinitionsTableError from "./error";

/**
 * Tier 2 injector for attribute definitions.
 *
 * `GET /api/attributes/` is public; create/update/delete need `attributes:*`. Deleting a definition
 * that categories still link is refused by the backend (409), which is surfaced inline.
 */
export default function AdminAttributeDefinitionsTable({
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  pageSize?: number;
}) {
  const { hasPermission, isSuperUser } = useAuth();

  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<
    | { kind: "none" }
    | { kind: "create" }
    | { kind: "edit"; definition: AttributeDefinition }
    | { kind: "delete"; definition: AttributeDefinition }
  >({ kind: "none" });
  const [busyDefinitionId, setBusyDefinitionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  const { definitions, total, page: currentPage, pages, isLoading, isError, error, refetch } =
    useGetAttributeDefinitions({ page, size: pageSize });
  const deleteDefinition = useDeleteAttributeDefinition();

  const canCreate = isSuperUser || hasPermission(Permissions.Attributes_Create);
  const canUpdate = isSuperUser || hasPermission(Permissions.Attributes_Update);
  const canDelete = isSuperUser || hasPermission(Permissions.Attributes_Delete);

  const rows: AttributeDefinitionRowData[] = definitions.map((definition) => ({
    id: definition.id,
    name: definition.name,
    slug: definition.slug,
    valueTypeLabel: ATTRIBUTE_VALUE_TYPE_LABELS[definition.value_type],
    unit: definition.unit,
    choices: definition.choices,
    isSpecification: definition.is_specification,
    isFilterable: definition.is_filterable,
    isVariant: definition.is_variant,
    group: definition.group,
    displayOrder: definition.display_order,
  }));

  const handleDelete = (definition: AttributeDefinition) => {
    setActionError(null);
    setBusyDefinitionId(definition.id);

    deleteDefinition.mutate(definition.id, {
      onSuccess: () => setDialog({ kind: "none" }),
      onError: setActionError,
      onSettled: () => setBusyDefinitionId(null),
    });
  };

  if (isLoading) return <AttributeDefinitionsTableLoading />;

  if (isError) {
    return (
      <AttributeDefinitionsTableError
        message={error?.message ?? "Failed to load attributes"}
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {actionError && (
          <FormError message={actionError.message} data-testid="attribute-definitions-action-error" />
        )}

        <AttributeDefinitionsTableUI
          definitions={rows}
          total={total}
          page={currentPage}
          pages={pages}
          busyDefinitionId={busyDefinitionId}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          callbacks={{
            onCreate: () => setDialog({ kind: "create" }),
            onEdit: (definitionId) => {
              const definition = definitions.find((item) => item.id === definitionId);
              if (definition) setDialog({ kind: "edit", definition });
            },
            onDelete: (definitionId) => {
              const definition = definitions.find((item) => item.id === definitionId);
              if (definition) setDialog({ kind: "delete", definition });
            },
            onPageChange: setPage,
          }}
        />
      </div>

      {dialog.kind === "create" && (
        <CreateAttributeDefinitionDialog onClose={() => setDialog({ kind: "none" })} />
      )}

      {dialog.kind === "edit" && (
        <EditAttributeDefinitionDialog
          definition={dialog.definition}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}

      {dialog.kind === "delete" && (
        <ConfirmDialog
          open
          destructive
          busy={busyDefinitionId === dialog.definition.id}
          title={`Delete ${dialog.definition.name}?`}
          description="Values already stored on products keep the id; the definition stops resolving."
          translations={{ confirmButtonText: "Delete attribute" }}
          callbacks={{
            onConfirm: () => handleDelete(dialog.definition),
            onCancel: () => setDialog({ kind: "none" }),
          }}
        />
      )}
    </>
  );
}
