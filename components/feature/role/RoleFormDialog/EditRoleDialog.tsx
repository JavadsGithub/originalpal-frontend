"use client";

import { useState } from "react";
import useUpdateRole from "@/data/feature/role/useUpdateRole";
import type { ApiError } from "@/lib/api-error";
import type { Role } from "@/lib/types/auth";
import RoleFormDialogUI, { type RoleFormValues } from "./index";

export interface EditRoleDialogProps {
  role: Role;
  onClose: () => void;
  onSaved?: (role: Role) => void;
}

/** Tier 2 injector: `PUT /api/roles/{id}` (name and `is_active`). */
export default function EditRoleDialog({ role, onClose, onSaved }: EditRoleDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);
  const updateRole = useUpdateRole();

  const handleSubmit = (values: RoleFormValues) => {
    setError(null);

    updateRole.mutate(
      { id: role.id, data: { name: values.name, is_active: values.is_active } },
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
    <RoleFormDialogUI
      mode="edit"
      submitting={updateRole.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      initialValues={{ name: role.name, is_active: role.is_active }}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
