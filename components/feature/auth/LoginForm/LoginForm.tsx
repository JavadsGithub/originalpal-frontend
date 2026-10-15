"use client";

import { useAuth } from "@/components/layout/auth-provider";
import { toApiError } from "@/lib/api-error";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import LoginFormUI from "./index";

export interface LoginFormProps {
  onSuccessRedirect?: string;
}

export default function LoginForm({ onSuccessRedirect }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // `?redirect=` is set by AuthGuard; default to the back office overview.
  const redirectUrl = onSuccessRedirect || searchParams.get("redirect") || "/admin";

  const handleSubmit = async (credentials: { username: string; password: string }) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(credentials);
      router.push(redirectUrl);
    } catch (error: unknown) {
      // `ApiError` already carries the backend's message for both error shapes (envelope and 422).
      setErrorMessage(toApiError(error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoginFormUI
      isLoading={isLoading}
      errorMessage={errorMessage}
      callbacks={{
        onSubmit: handleSubmit,
      }}
    />
  );
}
