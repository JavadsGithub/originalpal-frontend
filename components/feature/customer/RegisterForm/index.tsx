"use client";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/customer-rules";
import type { RegisterFormValues } from "@/lib/types/customer";
import { useState } from "react";

export interface RegisterFormTranslations {
  title: string;
  subtitle: string;
  firstNameLabel: string;
  lastNameLabel: string;
  emailLabel: string;
  usernameLabel: string;
  passwordLabel: string;
  passwordHint: string;
  submitButtonText: string;
  submittingButtonText: string;
  activeNotice: string;
}

export interface RegisterFormCallbacks {
  onSubmit: (values: RegisterFormValues) => void;
}

export interface RegisterFormUIProps {
  submitting?: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  translations?: Partial<RegisterFormTranslations>;
  callbacks: RegisterFormCallbacks;
}

const defaultTranslations: RegisterFormTranslations = {
  title: "Create your account",
  subtitle: "Register with an email and a password — you can shop right away.",
  firstNameLabel: "First name",
  lastNameLabel: "Last name",
  emailLabel: "Email",
  usernameLabel: "Username",
  passwordLabel: "Password",
  passwordHint: `At least ${MIN_PASSWORD_LENGTH} characters (the API enforces this).`,
  submitButtonText: "Create account",
  submittingButtonText: "Creating account...",
  activeNotice:
    "Unlike the back-office endpoint, self-registration activates the account immediately — signing in works straight away.",
};

/**
 * Tier 1 pure UI for `POST /api/auth/register`.
 *
 * Field ids match the API's snake_case names so a `422` from the backend lines up with the inputs.
 */
export default function RegisterFormUI({
  submitting = false,
  errorMessage = null,
  fieldErrors = {},
  translations = {},
  callbacks,
}: RegisterFormUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const [values, setValues] = useState<RegisterFormValues>({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    password: "",
  });

  const setValue = (field: keyof RegisterFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    callbacks.onSubmit(values);
  };

  const fieldProps = (field: keyof RegisterFormValues, id: string, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={values[field]}
        disabled={submitting}
        aria-invalid={Boolean(fieldErrors[field])}
        onChange={(event) => setValue(field, event.target.value)}
      />
      {fieldErrors[field] && <p className="text-xs text-destructive">{fieldErrors[field]}</p>}
    </div>
  );

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-6 space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {t.title}
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
        <FormError message={errorMessage} data-testid="register-error" />

        <div className="grid gap-4 sm:grid-cols-2">
          {fieldProps("firstName", "first_name", t.firstNameLabel)}
          {fieldProps("lastName", "last_name", t.lastNameLabel)}
        </div>

        {fieldProps("email", "email", t.emailLabel, "email")}
        {fieldProps("username", "username", t.usernameLabel)}

        <div className="space-y-1.5">
          <Label htmlFor="password">{t.passwordLabel}</Label>
          <Input
            id="password"
            type="password"
            value={values.password}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.password)}
            onChange={(event) => setValue("password", event.target.value)}
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.passwordHint}</p>
          {fieldErrors.password && (
            <p className="text-xs text-destructive">{fieldErrors.password}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? t.submittingButtonText : t.submitButtonText}
        </Button>
      </form>

      <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">{t.activeNotice}</p>
    </div>
  );
}
