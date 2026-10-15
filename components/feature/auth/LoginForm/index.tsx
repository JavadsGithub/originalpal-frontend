import { Button } from "@/components/ui/button";
import React, { useState } from "react";

export interface LoginFormTranslations {
  title: string;
  subtitle: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  submitButtonText: string;
  submittingButtonText: string;
}

export interface LoginFormCallbacks {
  onSubmit: (credentials: { username: string; password: string }) => void;
}

export interface LoginFormUIProps {
  translations?: Partial<LoginFormTranslations>;
  callbacks: LoginFormCallbacks;
  isLoading?: boolean;
  errorMessage?: string | null;
}

const defaultTranslations: LoginFormTranslations = {
  title: "Welcome back",
  subtitle: "Please enter your details to sign in.",
  usernameLabel: "Username",
  usernamePlaceholder: "Enter your username",
  passwordLabel: "Password",
  passwordPlaceholder: "••••••••",
  submitButtonText: "Sign in",
  submittingButtonText: "Signing in...",
};

export default function LoginFormUI({
  translations = {},
  callbacks,
  isLoading = false,
  errorMessage = null,
}: LoginFormUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || isLoading) return;
    callbacks.onSubmit({ username, password });
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-6 space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {t.title}
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t.subtitle}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
          >
            {t.usernameLabel}
          </label>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t.usernamePlaceholder}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-100"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
          >
            {t.passwordLabel}
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.passwordPlaceholder}
            className="mt-1 block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:border-neutral-100"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full justify-center"
        >
          {isLoading ? t.submittingButtonText : t.submitButtonText}
        </Button>
      </form>
    </div>
  );
}
