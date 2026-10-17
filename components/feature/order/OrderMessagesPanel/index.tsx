"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OrderMessage } from "@/lib/types/order";

export interface OrderMessagesPanelTranslations {
  heading: string;
  description: string;
  emptyState: string;
  retryText: string;
  retryingText: string;
  attemptsLabel: string;
  errorLabel: string;
  recipientLabel: string;
}

export interface OrderMessagesPanelCallbacks {
  onRetry: (messageId: string) => void;
}

export interface OrderMessagesPanelUIProps {
  /** `POST …/messages/{id}/retry` is gated on `orders:fulfill` — reading the log only needs `orders:read`. */
  canRetry: boolean;
  messages: OrderMessage[];
  busy: boolean;
  errorMessage?: string | null;
  translations?: Partial<OrderMessagesPanelTranslations>;
  callbacks: OrderMessagesPanelCallbacks;
}

const defaultTranslations: OrderMessagesPanelTranslations = {
  heading: "Notifications",
  description:
    "The backend dispatches these itself — an order confirmation when payment succeeds, a dispatch notice when the order ships — through a no-op provider that cannot fail today. The retry endpoint is here for when a real provider can.",
  emptyState: "No notification has been produced for this order yet.",
  retryText: "Retry",
  retryingText: "Retrying...",
  attemptsLabel: "attempts",
  errorLabel: "Error",
  recipientLabel: "To",
};

const STATUS_VARIANTS = { sent: "success", failed: "danger", pending: "outline" } as const;

/** Tier 1 delivery log for an order's outbound notifications. */
export default function OrderMessagesPanelUI({
  canRetry,
  messages,
  busy,
  errorMessage,
  translations = {},
  callbacks,
}: OrderMessagesPanelUIProps) {
  const t = { ...defaultTranslations, ...translations };

  return (
    <section className="space-y-3 rounded-lg border border-border p-4" data-testid="order-messages">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{t.heading}</h2>
        <p className="max-w-3xl text-xs text-muted-foreground">{t.description}</p>
      </div>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      {messages.length === 0 ? (
        <p className="text-xs text-muted-foreground" data-testid="order-messages-empty">
          {t.emptyState}
        </p>
      ) : (
        <ul className="space-y-2">
          {messages.map((message) => (
            <li
              key={message.id}
              className="space-y-1 rounded-md border border-border px-3 py-2 text-xs"
              data-testid={`order-message-${message.kind}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{message.kind.replace(/_/g, " ")}</span>
                <Badge variant={STATUS_VARIANTS[message.status]}>{message.status}</Badge>
                <span className="text-muted-foreground">
                  {t.recipientLabel}: {message.recipient}
                </span>
                <span className="text-muted-foreground">
                  {message.attempt_count} {t.attemptsLabel}
                </span>
                {message.status === "failed" && canRetry && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => callbacks.onRetry(message.id)}
                  >
                    {busy ? t.retryingText : t.retryText}
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground">{message.subject}</p>
              {message.error_message && (
                <p className="text-destructive">
                  {t.errorLabel}: {message.error_message}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
