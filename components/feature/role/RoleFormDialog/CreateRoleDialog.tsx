"use client";

import { useState } from "react";
import useCreateRole from "@/data/feature/role/useCreateRole";
import type { ApiError } from "@/lib/api-error";
import type { Role } from "@/lib/types/auth";
import RoleFormDialogUI, { type RoleFormValues } from "./index";

export interface CreateRoleDialogProps {
  onClose: () => void;
  onCreated?: (role: Role) => void;
}

/** Tier 2 injector: `POST /api/roles/` behind the shared role form UI. */
export default function CreateRoleDialog({ onClose, onCreated }: CreateRoleDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);
  const createRole = useCreateRole();

  const handleSubmit = (values: RoleFormValues) => {
    setError(null);

    createRole.mutate(
      { name: values.name },
      {
        onSuccess: (role) => {
          onCreated?.(role);
          onClose();
        },
        onError: setError,
      },
    );
  };

  return (
    <RoleFormDialogUI
      mode="create"
      submitting={createRole.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
