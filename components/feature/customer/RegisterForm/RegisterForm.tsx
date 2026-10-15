"use client";

import useRegisterCustomer from "@/data/feature/customer/useRegisterCustomer";
import { toApiError } from "@/lib/api-error";
import { validateRegistration } from "@/lib/customer-rules";
import type { RegisterFormValues } from "@/lib/types/customer";
import { useRouter } from "next/navigation";
import { useState } from "react";
import RegisterFormUI from "./index";

export interface RegisterFormProps {
  /** Where to send the customer once the account exists; they still have to sign in. */
  onSuccessRedirect?: string;
}

/**
 * Tier 2 injector for customer registration.
 *
 * Registration does not issue a token, so success leads to the sign-in form with the new username
 * prefilled — the flow the backend actually supports. Local validation only fills in what the API
 * would answer anyway; a `409` for a taken email or username is shown verbatim.
 */
export default function RegisterForm({ onSuccessRedirect = "/login?registered=1" }: RegisterFormProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const registerCustomer = useRegisterCustomer({
    onSuccess: () => router.push(onSuccessRedirect),
  });

  const handleSubmit = (values: RegisterFormValues) => {
    setErrorMessage(null);

    const localErrors = validateRegistration(values);
    setFieldErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    registerCustomer.mutate(
      {
        first_name: values.firstName.trim(),
        last_name: values.lastName.trim(),
        email: values.email.trim(),
        username: values.username.trim(),
        password: values.password,
      },
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
    <RegisterFormUI
      submitting={registerCustomer.isPending}
      errorMessage={errorMessage}
      fieldErrors={fieldErrors}
      callbacks={{ onSubmit: handleSubmit }}
    />
  );
}
