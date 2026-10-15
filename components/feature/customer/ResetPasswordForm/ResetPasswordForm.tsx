"use client";

import useResetPassword from "@/data/feature/customer/useResetPassword";
import { toApiError } from "@/lib/api-error";
import { validatePasswordReset } from "@/lib/customer-rules";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import ResetPasswordFormUI from "./index";

/**
 * Tier 2 injector for the reset step.
 *
 * Success leads to the sign-in form with a flag: the old password stops working the moment the new
 * one is stored, so the customer has to sign in again (verified live — see audit §11).
 */
export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resetPassword = useResetPassword({
    onSuccess: () => router.push("/login?reset=1"),
  });

  const handleSubmit = ({ token: submittedToken, newPassword }: { token: string; newPassword: string }) => {
    setErrorMessage(null);

    const localErrors = validatePasswordReset(submittedToken, newPassword);
    setFieldErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    resetPassword.mutate(
      { token: submittedToken, new_password: newPassword },
      {
        onError: (error) => {
          const apiError = toApiError(error);
          setErrorMessage(apiError.message);
          setFieldErrors(apiError.fieldErrors);
        },
      },
    );
  };

  return (
    <ResetPasswordFormUI
      initialToken={token}
      submitting={resetPassword.isPending}
      errorMessage={errorMessage}
      fieldErrors={fieldErrors}
      callbacks={{ onSubmit: handleSubmit }}
    />
  );
}
