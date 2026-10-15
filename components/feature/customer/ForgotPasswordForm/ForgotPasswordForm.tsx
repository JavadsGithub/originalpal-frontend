"use client";

import useRequestPasswordRecovery from "@/data/feature/customer/useRequestPasswordRecovery";
import { toApiError } from "@/lib/api-error";
import type { PasswordRecoveryResponse } from "@/lib/types/customer";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ForgotPasswordFormUI from "./index";

/**
 * Tier 2 injector for password recovery.
 *
 * The token is handed to `/reset-password?token=...` so the customer does not have to copy it out of
 * the screen; the token is in the URL only for this dev-shaped flow (see the UI's notice).
 */
export default function ForgotPasswordForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<PasswordRecoveryResponse | null>(null);

  const requestRecovery = useRequestPasswordRecovery({ onSuccess: setAccepted });

  return (
    <ForgotPasswordFormUI
      accepted={accepted}
      submitting={requestRecovery.isPending}
      errorMessage={errorMessage}
      callbacks={{
        onSubmit: (email) => {
          setErrorMessage(null);
          setAccepted(null);
          requestRecovery.mutate(
            { email },
            { onError: (error) => setErrorMessage(toApiError(error).message) },
          );
        },
        onUseToken: (token) =>
          router.push(`/reset-password?token=${encodeURIComponent(token)}`),
      }}
    />
  );
}
