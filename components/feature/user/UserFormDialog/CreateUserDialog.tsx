"use client";

import { useState } from "react";
import useCreateUser from "@/data/feature/user/useCreateUser";
import type { ApiError } from "@/lib/api-error";
import type { User } from "@/lib/types/auth";
import UserFormDialogUI, { type UserFormValues } from "./index";

export interface CreateUserDialogProps {
  onClose: () => void;
  onCreated?: (user: User) => void;
}

/**
 * Tier 2 dependency injector: wires `useCreateUser` into the shared form UI.
 *
 * Reminder encoded in the UI copy and in the backend contract: the created account is **inactive**
 * (`POST /api/users/` → `is_active: false`), so the admin table offers a one-click "Activate".
 */
export default function CreateUserDialog({ onClose, onCreated }: CreateUserDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);
  const createUser = useCreateUser();

  const handleSubmit = (values: UserFormValues) => {
    setError(null);

    createUser.mutate(
      {
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        email: values.email.trim(),
        username: values.username.trim(),
        password: values.password,
      },
      {
        onSuccess: (user) => {
          onCreated?.(user);
          onClose();
        },
        onError: setError,
      },
    );
  };

  return (
    <UserFormDialogUI
      mode="create"
      submitting={createUser.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
