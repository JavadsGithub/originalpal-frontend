"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canOwnerCancel } from "@/lib/order-rules";
import type { Order } from "@/lib/types/order";

export interface GuestOrderActionsTranslations {
  heading: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  cancelText: string;
  busyText: string;
  notAvailableText: string;
}

export interface GuestOrderActionsCallbacks {
  onCancel: (reason: string) => void;
  onReasonChange: (reason: string) => void;
}

export interface GuestOrderActionsUIProps {
  order: Order;
  busy: boolean;
  reason: string;
  errorMessage?: string | null;
  successMessage?: string | null;
  translations?: Partial<GuestOrderActionsTranslations>;
  callbacks: GuestOrderActionsCallbacks;
}

const defaultTranslations: GuestOrderActionsTranslations = {
  heading: "Your order",
  reasonLabel: "Reason",
  reasonPlaceholder: "Why are you cancelling?",
  cancelText: "Cancel this order",
  busyText: "Cancelling...",
  notAvailableText:
    "This order can no longer be cancelled from here: a guest may cancel only an unpaid order. Once the payment has gone through, only the shop can cancel it — and its refund is recorded on the order.",
};

/**
 * Tier 1 guest self-service actions.
 *
 * A guest has no session, so the token in the link is the authorisation — `POST
 * /api/orders/{id}/guest-cancel` takes it in the body. The API only accepts it while the order is
 * `awaiting_payment` ("Only unpaid orders can be cancelled by their owner"), which is narrower than the
 * back office's own `cancel`; `lib/order-rules.ts` mirrors that difference so the button never offers a
 * call the API would refuse with `422 field=status`.
 */
export default function GuestOrderActionsUI({
  order,
  busy,
  reason,
  errorMessage,
  successMessage,
  translations = {},
  callbacks,
}: GuestOrderActionsUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const cancellable = canOwnerCancel(order);

  return (
    <div className="space-y-3" data-testid="guest-order-actions">
      <p className="text-xs font-semibold text-foreground">{t.heading}</p>

      {!cancellable && (
        <p className="text-xs text-muted-foreground" data-testid="guest-cancel-unavailable">
          {t.notAvailableText}
        </p>
      )}

      {cancellable && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="guest-cancel-reason" className="text-xs">
                {t.reasonLabel}
              </Label>
              <Input
                id="guest-cancel-reason"
                value={reason}
                placeholder={t.reasonPlaceholder}
                className="h-8 w-64 text-xs"
                onChange={(event) => callbacks.onReasonChange(event.target.value)}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => callbacks.onCancel(reason)}
            >
              {busy ? t.busyText : t.cancelText}
            </Button>
          </div>
        </div>
      )}

      {successMessage && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" data-testid="guest-cancel-success">
          {successMessage}
        </p>
      )}

      {errorMessage && (
        <p className="text-sm text-destructive" data-testid="guest-cancel-error">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
