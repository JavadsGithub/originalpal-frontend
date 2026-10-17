"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type UserFormMode = "create" | "edit";

export interface UserFormValues {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  is_active: boolean;
}

export interface UserFormDialogTranslations {
  createTitle: string;
  editTitle: string;
  createDescription: string;
  editDescription: string;
  firstNameLabel: string;
  lastNameLabel: string;
  emailLabel: string;
  usernameLabel: string;
  passwordLabel: string;
  passwordHint: string;
  activeLabel: string;
  submitCreate: string;
  submitEdit: string;
  submitting: string;
  cancel: string;
  inactiveWarning: string;
}

export interface UserFormDialogCallbacks {
  onSubmit: (values: UserFormValues) => void;
  onCancel: () => void;
}

export interface UserFormDialogUIProps {
  mode: UserFormMode;
  initialValues?: Partial<UserFormValues>;
  submitting?: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  translations?: Partial<UserFormDialogTranslations>;
  callbacks: UserFormDialogCallbacks;
}

const defaultTranslations: UserFormDialogTranslations = {
  createTitle: "New user",
  editTitle: "Edit user",
  createDescription:
    "The account is created inactive — activate it once the person should be able to sign in.",
  editDescription: "Leave a field untouched to keep its current value.",
  firstNameLabel: "First name",
  lastNameLabel: "Last name",
  emailLabel: "Email",
  usernameLabel: "Username",
  passwordLabel: "Password",
  passwordHint: "Minimum 8 characters.",
  activeLabel: "Active (can sign in)",
  submitCreate: "Create user",
  submitEdit: "Save changes",
  submitting: "Saving...",
  cancel: "Cancel",
  inactiveWarning: "Inactive accounts cannot sign in — the backend rejects them with INACTIVE_USER.",
};

const EMPTY_VALUES: UserFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  username: "",
  password: "",
  is_active: false,
};

/**
 * Tier 1 pure UI for both the create and the edit dialog. It renders inputs, surfaces field-level
 * errors from `ApiError.fieldErrors`, and never touches the API.
 */
export default function UserFormDialogUI({
  mode,
  initialValues,
  submitting = false,
  errorMessage = null,
  fieldErrors = {},
  translations = {},
  callbacks,
}: UserFormDialogUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const [values, setValues] = useState<UserFormValues>({
    ...EMPTY_VALUES,
    ...initialValues,
  });

  const isCreate = mode === "create";

  const update = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <Dialog
      open
      busy={submitting}
      onClose={callbacks.onCancel}
      title={isCreate ? t.createTitle : t.editTitle}
      description={isCreate ? t.createDescription : t.editDescription}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={callbacks.onCancel}
            disabled={submitting}
          >
            {t.cancel}
          </Button>
          <Button type="submit" form="user-form" size="sm" disabled={submitting}>
            {submitting ? t.submitting : isCreate ? t.submitCreate : t.submitEdit}
          </Button>
        </>
      }
    >
      <form
        id="user-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          callbacks.onSubmit(values);
        }}
      >
        <FormError message={errorMessage} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="first_name"
            label={t.firstNameLabel}
            value={values.first_name}
            error={fieldErrors.first_name}
            onChange={(value) => update("first_name", value)}
            disabled={submitting}
          />
          <Field
            id="last_name"
            label={t.lastNameLabel}
            value={values.last_name}
            error={fieldErrors.last_name}
            onChange={(value) => update("last_name", value)}
            disabled={submitting}
          />
          <Field
            id="email"
            label={t.emailLabel}
            type="email"
            value={values.email}
            error={fieldErrors.email}
            onChange={(value) => update("email", value)}
            disabled={submitting}
          />
          <Field
            id="username"
            label={t.usernameLabel}
            value={values.username}
            error={fieldErrors.username}
            onChange={(value) => update("username", value)}
            disabled={submitting}
          />
        </div>

        {isCreate && (
          <div className="space-y-1.5">
            <Label htmlFor="password">{t.passwordLabel}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={(event) => update("password", event.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password ? (
              <p className="text-xs text-destructive">{fieldErrors.password}</p>
            ) : (
              <p className="text-xs text-muted-foreground">{t.passwordHint}</p>
            )}
          </div>
        )}

        {!isCreate && (
          <div className="space-y-2 rounded-md border border-border p-3">
            <Checkbox
              id="is_active"
              label={t.activeLabel}
              checked={values.is_active}
              onChange={(event) => update("is_active", event.target.checked)}
              disabled={submitting}
            />
            {!values.is_active && (
              <p className="text-xs text-amber-700 dark:text-amber-400">{t.inactiveWarning}</p>
            )}
          </div>
        )}
      </form>
    </Dialog>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  type?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function Field({ id, label, value, error, type = "text", disabled, onChange }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
