"use client";

import { useAuth } from "@/components/layout/auth-provider";
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

  const redirectUrl =
    onSuccessRedirect || searchParams.get("redirect") || "/examples/admin/users";

  const handleSubmit = async (credentials: { username: string; password: string }) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(credentials);
      router.push(redirectUrl);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Failed to authenticate. Please check your credentials.",
      );
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
