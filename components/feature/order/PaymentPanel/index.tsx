"use client";

import { Button } from "@/components/ui/button";
import { formatPriceCents } from "@/lib/types/catalog";
import { canStartPayment, formatCountdown } from "@/lib/order-rules";
import type { Order, PaymentAttempt } from "@/lib/types/order";

export interface PaymentPanelTranslations {
  heading: string;
  explanation: string;
  mockNotice: string;
  startButtonText: string;
  startingText: string;
  callbackHeading: string;
  succeedText: string;
  failText: string;
  cancelText: string;
  verifyingText: string;
  attemptsHeading: string;
  noAttemptsText: string;
  windowLabel: string;
  windowClosedText: string;
  paidText: string;
  referenceLabel: string;
}

export interface PaymentPanelCallbacks {
  onStart: () => void;
  onVerify: (outcome: "succeeded" | "failed" | "cancelled") => void;
}

export interface PaymentPanelUIProps {
  order: Order;
  attempts: PaymentAttempt[];
  /** Milliseconds left in the payment window, ticking in the injector. */
  remainingMs: number;
  busy: boolean;
  errorMessage?: string | null;
  translations?: Partial<PaymentPanelTranslations>;
  callbacks: PaymentPanelCallbacks;
}

const defaultTranslations: PaymentPanelTranslations = {
  heading: "Payment",
  explanation:
    "Starting a payment mints an attempt with the mock provider at the order's full total; verifying it is what commits the reserved stock and marks the order paid.",
  mockNotice:
    "The provider is a mock: its checkout URL points at `payments.example`, which does not exist. The buttons below send the callback the API would normally receive, so the whole lifecycle — including a failed payment and the retry — can be exercised end to end.",
  startButtonText: "Start a payment attempt",
  startingText: "Starting...",
  callbackHeading: "Provider callback",
  succeedText: "Report succeeded",
  failText: "Report failed",
  cancelText: "Report cancelled",
  verifyingText: "Verifying...",
  attemptsHeading: "Attempts",
  noAttemptsText: "No payment attempt yet.",
  windowLabel: "Payment window",
  windowClosedText: "The window has closed — the next call will expire the order and release the stock.",
  paidText: "This order is paid.",
  referenceLabel: "Provider reference",
};

/**
 * Tier 1 payment panel.
 *
 * This screen exists because the backend's provider is a mock (`payments.example`): the only way an
 * order ever becomes `paid` is the provider's callback, `POST /api/payment-attempts/{id}/verify`, so the
 * UI sends it explicitly and labels it as such. The attempt list shows every attempt with its status —
 * a failed attempt is a normal state, and a new one can be started afterwards.
 */
export default function PaymentPanelUI({
  order,
  attempts,
  remainingMs,
  busy,
  errorMessage,
  translations = {},
  callbacks,
}: PaymentPanelUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const pending = attempts.find((attempt) => attempt.status === "pending") ?? null;
  const payable = canStartPayment(order);
  const succeeded = attempts.find((attempt) => attempt.status === "succeeded") ?? null;

  return (
    <div className="space-y-4" data-testid="payment-panel">
      <p className="max-w-3xl text-xs text-muted-foreground">{t.explanation}</p>

      {order.status === "awaiting_payment" && !order.payment_exception && (
        <p className="text-xs text-muted-foreground" data-testid="payment-window-remaining">
          {t.windowLabel}:{" "}
          <span className="font-mono text-foreground">{formatCountdown(remainingMs)}</span>
          {remainingMs === 0 && <span className="text-destructive"> — {t.windowClosedText}</span>}
        </p>
      )}

      {succeeded && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400" data-testid="payment-succeeded">
          {t.paidText} {t.referenceLabel}: {succeeded.provider_reference ?? "—"}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!payable || busy || Boolean(pending)}
          onClick={callbacks.onStart}
        >
          {busy ? t.startingText : t.startButtonText}
        </Button>

        {pending && (
          <>
            <span className="text-xs text-muted-foreground">{t.callbackHeading}:</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => callbacks.onVerify("succeeded")}
            >
              {t.succeedText}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => callbacks.onVerify("failed")}
            >
              {t.failText}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => callbacks.onVerify("cancelled")}
            >
              {t.cancelText}
            </Button>
          </>
        )}
      </div>

      <p className="max-w-3xl text-xs text-muted-foreground">{t.mockNotice}</p>

      {errorMessage && (
        <p className="text-sm text-destructive" data-testid="payment-error">
          {errorMessage}
        </p>
      )}

      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground">{t.attemptsHeading}</p>
        {attempts.length === 0 ? (
          <p className="text-xs text-muted-foreground" data-testid="payment-attempts-empty">
            {t.noAttemptsText}
          </p>
        ) : (
          <ul className="space-y-1" data-testid="payment-attempts">
            {attempts.map((attempt) => (
              <li key={attempt.id} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-muted-foreground">{attempt.id.slice(0, 8)}</span>
                <span
                  className="font-medium text-foreground"
                  data-testid={`payment-attempt-status-${attempt.status}`}
                >
                  {attempt.status}
                </span>
                <span className="text-muted-foreground">{formatPriceCents(attempt.amount_cents)}</span>
                <span className="text-muted-foreground">{attempt.provider}</span>
                {attempt.failure_reason && (
                  <span className="text-destructive">{attempt.failure_reason}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
