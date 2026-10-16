"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface GuestOrderLookupTranslations {
  heading: string;
  description: string;
  orderIdLabel: string;
  tokenLabel: string;
  submitText: string;
  submittingText: string;
  claimHeading: string;
  claimDescription: string;
  claimButtonText: string;
  claimSentText: string;
  confirmButtonText: string;
  verificationLabel: string;
  signedOutHint: string;
}

export interface GuestOrderLookupCallbacks {
  onLookup: (orderId: string, token: string) => void;
  onClaim: (orderId: string, token: string) => void;
  onConfirm: (verificationToken: string) => void;
}

export interface GuestOrderLookupUIProps {
  orderId: string;
  token: string;
  submitting: boolean;
  errorMessage?: string | null;
  /** Signed-in visitors can also claim the order for their account. */
  canClaim: boolean;
  /** The `verification_token` the request step returned — the backend has no email yet, so it is shown. */
  verificationToken?: string | null;
  verificationExpiresAt?: string | null;
  claimSubmitting: boolean;
  claimError?: string | null;
  translations?: Partial<GuestOrderLookupTranslations>;
  callbacks: GuestOrderLookupCallbacks;
}

const defaultTranslations: GuestOrderLookupTranslations = {
  heading: "Find a guest order",
  description:
    "A guest order is readable with its access token and nothing else — there is no account behind it.",
  orderIdLabel: "Order id",
  tokenLabel: "Access token",
  submitText: "Open the order",
  submittingText: "Looking...",
  claimHeading: "Claim it for your account",
  claimDescription:
    "Signed in? Association proves you know the access token **and** that the order's contact email is yours, so an order can only be claimed by the person it was placed for.",
  claimButtonText: "Request to claim",
  claimSentText:
    "The backend returned the verification token here because it has no outbound email yet (follow-up #11). It is single-use and expires in an hour.",
  confirmButtonText: "Confirm and add to my orders",
  verificationLabel: "Verification token",
  signedOutHint: "Sign in to claim an order for your account.",
};

/**
 * Tier 1 lookup + claim form.
 *
 * Two capabilities in one screen, because they belong together: opening a guest order (id + access
 * token) and claiming it for an account (the same two values, plus a session). The claim flow is
 * two-step on the backend and the token comes back in the response — so it is displayed, with the
 * reason, exactly like the password-recovery screen does.
 */
export default function GuestOrderLookupUI({
  orderId,
  token,
  submitting,
  errorMessage,
  canClaim,
  verificationToken,
  verificationExpiresAt,
  claimSubmitting,
  claimError,
  translations = {},
  callbacks,
}: GuestOrderLookupUIProps) {
  const t = { ...defaultTranslations, ...translations };

  return (
    <div className="space-y-6" data-testid="order-lookup">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.heading}</h1>
        <p className="max-w-2xl text-xs text-muted-foreground">{t.description}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lookup-order-id">{t.orderIdLabel}</Label>
            <Input
              id="lookup-order-id"
              data-testid="lookup-order-id"
              value={orderId}
              onChange={(event) => callbacks.onLookup(event.target.value, token)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lookup-token">{t.tokenLabel}</Label>
            <Input
              id="lookup-token"
              data-testid="lookup-token"
              value={token}
              onChange={(event) => callbacks.onLookup(orderId, event.target.value)}
            />
          </div>
        </div>

        {errorMessage && (
          <p className="text-sm text-destructive" data-testid="lookup-error">
            {errorMessage}
          </p>
        )}

        <Button
          type="button"
          disabled={submitting || !orderId.trim() || !token.trim()}
          onClick={() => callbacks.onLookup(orderId, token)}
        >
          {submitting ? t.submittingText : t.submitText}
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{t.claimHeading}</h2>
        <p className="max-w-2xl text-xs text-muted-foreground">{t.claimDescription}</p>

        {canClaim ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={claimSubmitting || !orderId.trim() || !token.trim()}
              onClick={() => callbacks.onClaim(orderId, token)}
            >
              {t.claimButtonText}
            </Button>

            {verificationToken && (
              <div className="space-y-2" data-testid="claim-verification">
                <p className="max-w-2xl text-xs text-amber-700 dark:text-amber-400">
                  {t.claimSentText}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.verificationLabel}:{" "}
                  <span className="font-mono text-foreground">{verificationToken}</span>
                  {verificationExpiresAt && ` (until ${new Date(verificationExpiresAt).toLocaleTimeString()})`}
                </p>
                <Button
                  type="button"
                  size="sm"
                  disabled={claimSubmitting}
                  onClick={() => callbacks.onConfirm(verificationToken)}
                >
                  {t.confirmButtonText}
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{t.signedOutHint}</p>
        )}

        {claimError && (
          <p className="text-sm text-destructive" data-testid="claim-error">
            {claimError}
          </p>
        )}
      </section>
    </div>
  );
}
