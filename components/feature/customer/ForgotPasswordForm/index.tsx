"use client";

import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export interface ForgotPasswordFormTranslations {
  title: string;
  subtitle: string;
  emailLabel: string;
  submitButtonText: string;
  submittingButtonText: string;
  acceptedNotice: string;
  acceptedWithoutTokenNotice: string;
  tokenHeading: string;
  tokenNotice: string;
  expiresLabel: string;
}

export interface ForgotPasswordFormCallbacks {
  onSubmit: (email: string) => void;
  /** Continue straight to the reset form with the token that came back. */
  onUseToken: (token: string) => void;
}

export interface ForgotPasswordFormUIProps {
  accepted?: { reset_token: string | null; expires_at: string | null } | null;
  submitting?: boolean;
  errorMessage?: string | null;
  translations?: Partial<ForgotPasswordFormTranslations>;
  callbacks: ForgotPasswordFormCallbacks;
}

const defaultTranslations: ForgotPasswordFormTranslations = {
  title: "Recover your password",
  subtitle: "Tell us the email on the account and we will start a reset.",
  emailLabel: "Email",
  submitButtonText: "Start recovery",
  submittingButtonText: "Starting...",
  acceptedNotice:
    "Request accepted. The API answers the same way whether or not the email exists, so this message never reveals which accounts are registered.",
  acceptedWithoutTokenNotice:
    "No reset token came back, which means no active account uses that email. If you expected one, check the spelling or ask an administrator to activate the account.",
  tokenHeading: "Reset token",
  tokenNotice:
    "This build shows the token directly: the backend has no outbound email yet, so `POST /api/auth/recovery/request` returns the raw token in its payload (see backend follow-up #11). It is single-use and expires one hour after it is issued.",
  expiresLabel: "Expires at",
};

/**
 * Tier 1 pure UI for the first half of `POST /api/auth/recovery/request`.
 *
 * The endpoint is deliberately uninformative (`{accepted: true}` either way), so the UI mirrors
 * that: a success message, plus the token when one came back.
 */
export default function ForgotPasswordFormUI({
  accepted = null,
  submitting = false,
  errorMessage = null,
  translations = {},
  callbacks,
}: ForgotPasswordFormUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const [email, setEmail] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || !email.trim()) return;
    callbacks.onSubmit(email.trim());
  };

  return (
    <div className="rounded-xl border border-border bg-background p-8 shadow-sm">
      <div className="mb-6 space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="forgot-password-form">
        <FormError message={errorMessage} data-testid="forgot-password-error" />

        <div className="space-y-1.5">
          <Label htmlFor="recovery-email">{t.emailLabel}</Label>
          <Input
            id="recovery-email"
            type="email"
            value={email}
            disabled={submitting}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting || !email.trim()}>
          {submitting ? t.submittingButtonText : t.submitButtonText}
        </Button>
      </form>

      {accepted && (
        <div className="mt-6 space-y-2" data-testid="recovery-accepted">
          <p className="text-xs text-muted-foreground">{t.acceptedNotice}</p>

          {accepted.reset_token ? (
            <div className="space-y-2 rounded-md border border-border p-3">
              <h3 className="text-xs font-semibold text-foreground">{t.tokenHeading}</h3>
              <code
                className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs text-foreground"
                data-testid="reset-token"
              >
                {accepted.reset_token}
              </code>
              <p className="text-xs text-muted-foreground">{t.tokenNotice}</p>
              {accepted.expires_at && (
                <p className="text-xs text-muted-foreground">
                  {t.expiresLabel}: <span className="font-mono">{accepted.expires_at}</span>
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => callbacks.onUseToken(accepted.reset_token as string)}
              >
                Use this token
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground" data-testid="recovery-no-token">
              {t.acceptedWithoutTokenNotice}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
