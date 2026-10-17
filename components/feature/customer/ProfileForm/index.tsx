"use client";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileFormValues } from "@/lib/types/customer";
import { useState } from "react";

export interface ProfileFormTranslations {
  title: string;
  subtitle: string;
  firstNameLabel: string;
  lastNameLabel: string;
  usernameLabel: string;
  emailLabel: string;
  emailNotice: string;
  submitButtonText: string;
  submittingButtonText: string;
  savedNotice: string;
}

export interface ProfileFormCallbacks {
  onSubmit: (values: ProfileFormValues) => void;
}

export interface ProfileFormUIProps {
  initialValues: ProfileFormValues & { email: string };
  submitting?: boolean;
  saved?: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  translations?: Partial<ProfileFormTranslations>;
  callbacks: ProfileFormCallbacks;
}

const defaultTranslations: ProfileFormTranslations = {
  title: "Your details",
  subtitle: "Only the fields you change are sent to the API.",
  firstNameLabel: "First name",
  lastNameLabel: "Last name",
  usernameLabel: "Username",
  emailLabel: "Email",
  emailNotice:
    "The email is read-only: PUT /api/auth/me does not accept it (the API answers 422 for unknown fields), and changing it needs a verification flow the backend does not have yet.",
  submitButtonText: "Save changes",
  submittingButtonText: "Saving...",
  savedNotice: "Profile updated.",
};

/** Tier 1 pure UI for `PUT /api/auth/me`. */
export default function ProfileFormUI({
  initialValues,
  submitting = false,
  saved = false,
  errorMessage = null,
  fieldErrors = {},
  translations = {},
  callbacks,
}: ProfileFormUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const [values, setValues] = useState<ProfileFormValues>({
    firstName: initialValues.firstName,
    lastName: initialValues.lastName,
    username: initialValues.username,
  });

  const setValue = (field: keyof ProfileFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  const isDirty =
    values.firstName !== initialValues.firstName ||
    values.lastName !== initialValues.lastName ||
    values.username !== initialValues.username;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    callbacks.onSubmit(values);
  };

  return (
    <section
      className="space-y-4 rounded-xl border border-border p-6"
      data-testid="profile-form"
    >
      <header className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{t.title}</h2>
        <p className="text-xs text-muted-foreground">{t.subtitle}</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError message={errorMessage} data-testid="profile-error" />
        {saved && !isDirty && !errorMessage && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            {t.savedNotice}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">{t.firstNameLabel}</Label>
            <Input
              id="first_name"
              value={values.firstName}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.firstName)}
              onChange={(event) => setValue("firstName", event.target.value)}
            />
            {fieldErrors.firstName && (
              <p className="text-xs text-destructive">{fieldErrors.firstName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="last_name">{t.lastNameLabel}</Label>
            <Input
              id="last_name"
              value={values.lastName}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.lastName)}
              onChange={(event) => setValue("lastName", event.target.value)}
            />
            {fieldErrors.lastName && (
              <p className="text-xs text-destructive">{fieldErrors.lastName}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="username">{t.usernameLabel}</Label>
          <Input
            id="username"
            value={values.username}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.username)}
            onChange={(event) => setValue("username", event.target.value)}
          />
          {fieldErrors.username && (
            <p className="text-xs text-destructive">{fieldErrors.username}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">{t.emailLabel}</Label>
          <Input id="email" value={initialValues.email} disabled readOnly />
          <p className="text-xs text-muted-foreground">{t.emailNotice}</p>
        </div>

        {fieldErrors.profile && <p className="text-xs text-destructive">{fieldErrors.profile}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? t.submittingButtonText : t.submitButtonText}
        </Button>
      </form>
    </section>
  );
}
