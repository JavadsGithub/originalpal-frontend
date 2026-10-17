"use client";

import useUpdateMyProfile from "@/data/feature/customer/useUpdateMyProfile";
import { useAuth } from "@/components/layout/auth-provider";
import { toApiError } from "@/lib/api-error";
import { validateProfileUpdate } from "@/lib/customer-rules";
import type { ProfileFormValues } from "@/lib/types/customer";
import { useState } from "react";
import ProfileFormUI from "./index";

/**
 * Tier 2 injector for the profile form.
 *
 * `PUT /api/auth/me` is partial: only changed fields are sent, so a no-op submit is never made
 * (the API refuses an empty body with `422 field=profile` anyway). `useUpdateMyProfile` replaces the
 * cached identity with the response, which is what keeps the header in sync.
 */
export default function ProfileForm() {
  const { user } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  // The banner is driven by the mutation itself — no effect, and no stale "saved" state: a submit
  // clears it, a successful one sets it again.
  const updateProfile = useUpdateMyProfile({ onSuccess: () => setSaved(true) });

  if (!user) return null;

  const handleSubmit = (values: ProfileFormValues) => {
    setErrorMessage(null);
    setSaved(false);

    const localErrors = validateProfileUpdate(values);
    setFieldErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    const data: Record<string, string> = {};
    if (values.firstName.trim() !== user.first_name) data.first_name = values.firstName.trim();
    if (values.lastName.trim() !== user.last_name) data.last_name = values.lastName.trim();
    if (values.username.trim() !== user.username) data.username = values.username.trim();

    if (Object.keys(data).length === 0) return;

    updateProfile.mutate(data, {
      onError: (error) => {
        const apiError = toApiError(error);
        setErrorMessage(apiError.message);
        setFieldErrors(apiError.fieldErrors);
      },
    });
  };

  return (
    <ProfileFormUI
      initialValues={{
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        email: user.email,
      }}
      submitting={updateProfile.isPending}
      saved={saved}
      errorMessage={errorMessage}
      fieldErrors={fieldErrors}
      callbacks={{ onSubmit: handleSubmit }}
    />
  );
}
