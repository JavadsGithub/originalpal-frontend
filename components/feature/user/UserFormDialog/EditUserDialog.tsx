"use client";

import { useState } from "react";
import useUpdateUser from "@/data/feature/user/useUpdateUser";
import type { ApiError } from "@/lib/api-error";
import type { User } from "@/lib/types/auth";
import UserFormDialogUI, { type UserFormValues } from "./index";

export interface EditUserDialogProps {
  user: User;
  onClose: () => void;
  onSaved?: (user: User) => void;
}

/**
 * Tier 2 dependency injector for editing an existing account, including the **activation toggle**
 * (`is_active`), which is the only way to let a newly created user sign in.
 */
export default function EditUserDialog({ user, onClose, onSaved }: EditUserDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);
  const updateUser = useUpdateUser();

  const handleSubmit = (values: UserFormValues) => {
    setError(null);

    updateUser.mutate(
      {
        id: user.id,
        data: {
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          email: values.email.trim(),
          username: values.username.trim(),
          is_active: values.is_active,
        },
      },
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
    <UserFormDialogUI
      mode="edit"
      submitting={updateUser.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      initialValues={{
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        username: user.username,
        is_active: user.is_active,
      }}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
