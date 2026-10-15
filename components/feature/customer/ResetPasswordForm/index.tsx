"use client";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/customer-rules";
import { useState } from "react";

export interface ResetPasswordFormTranslations {
  title: string;
  subtitle: string;
  tokenLabel: string;
  tokenHint: string;
  newPasswordLabel: string;
  newPasswordHint: string;
  submitButtonText: string;
  submittingButtonText: string;
  missingTokenNotice: string;
}

export interface ResetPasswordFormCallbacks {
  onSubmit: (values: { token: string; newPassword: string }) => void;
}

export interface ResetPasswordFormUIProps {
  initialToken?: string;
  submitting?: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  translations?: Partial<ResetPasswordFormTranslations>;
  callbacks: ResetPasswordFormCallbacks;
}

const defaultTranslations: ResetPasswordFormTranslations = {
  title: "Choose a new password",
  subtitle: "The token is single-use and expires one hour after it was issued.",
  tokenLabel: "Recovery token",
  tokenHint: "Filled in automatically when you arrive from the recovery step.",
  newPasswordLabel: "New password",
  newPasswordHint: `At least ${MIN_PASSWORD_LENGTH} characters.`,
  submitButtonText: "Set new password",
  submittingButtonText: "Saving...",
  missingTokenNotice:
    "No token in the URL — start from the recovery step, or paste the token you were given.",
};

/** Tier 1 pure UI for `POST /api/auth/recovery/reset`. */
export default function ResetPasswordFormUI({
  initialToken = "",
  submitting = false,
  errorMessage = null,
  fieldErrors = {},
  translations = {},
  callbacks,
}: ResetPasswordFormUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    callbacks.onSubmit({ token: token.trim(), newPassword });
  };

  return (
    <div className="rounded-xl border border-border bg-background p-8 shadow-sm">
      <div className="mb-6 space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      {!initialToken && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          {t.missingTokenNotice}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="reset-password-form">
        <FormError message={errorMessage} data-testid="reset-password-error" />

        <div className="space-y-1.5">
          <Label htmlFor="recovery-token">{t.tokenLabel}</Label>
          <Input
            id="recovery-token"
            value={token}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.token)}
            onChange={(event) => setToken(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t.tokenHint}</p>
          {fieldErrors.token && <p className="text-xs text-destructive">{fieldErrors.token}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new_password">{t.newPasswordLabel}</Label>
          <Input
            id="new_password"
            type="password"
            value={newPassword}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.newPassword)}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t.newPasswordHint}</p>
          {fieldErrors.newPassword && (
            <p className="text-xs text-destructive">{fieldErrors.newPassword}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? t.submittingButtonText : t.submitButtonText}
        </Button>
      </form>
    </div>
  );
}
