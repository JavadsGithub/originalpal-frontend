"use client";

import OrderViewUI from "@/components/feature/order/OrderView/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canCancel, canDeliver, canMarkProcessing, canRecordRefund, canShip, willRefundOnCancel } from "@/lib/order-rules";
import type { Order } from "@/lib/types/order";

export interface AdminOrderActions {
  canFulfill: boolean;
  canCancel: boolean;
  canRefund: boolean;
}

export interface AdminOrderDetailTranslations {
  actionsHeading: string;
  processingText: string;
  shipText: string;
  deliverText: string;
  cancelText: string;
  refundText: string;
  carrierLabel: string;
  trackingLabel: string;
  cancelReasonLabel: string;
  refundReferenceLabel: string;
  busyText: string;
  refundWarning: string;
  notAvailableText: string;
}

export interface AdminOrderDetailCallbacks {
  onProcessing: () => void;
  onShip: (carrier: string, trackingReference: string) => void;
  onDeliver: () => void;
  onCancel: (reason: string) => void;
  onRefund: (refundReference: string) => void;
  onCancelReasonChange: (reason: string) => void;
  onCarrierChange: (carrier: string) => void;
  onTrackingChange: (tracking: string) => void;
  onRefundReferenceChange: (reference: string) => void;
}

export interface AdminOrderDetailUIProps {
  order: Order;
  permissions: AdminOrderActions;
  busy: boolean;
  form: { carrier: string; tracking: string; cancelReason: string; refundReference: string };
  errorMessage?: string | null;
  successMessage?: string | null;
  /** The notifications panel the injector supplies. */
  messages?: React.ReactNode;
  translations?: Partial<AdminOrderDetailTranslations>;
  callbacks: AdminOrderDetailCallbacks;
}

const defaultTranslations: AdminOrderDetailTranslations = {
  actionsHeading: "Actions",
  processingText: "Mark processing",
  shipText: "Mark shipped",
  deliverText: "Mark delivered",
  cancelText: "Cancel the order",
  refundText: "Record the refund",
  carrierLabel: "Carrier",
  trackingLabel: "Tracking reference",
  cancelReasonLabel: "Reason",
  refundReferenceLabel: "Refund reference",
  busyText: "Working...",
  refundWarning:
    "This order was paid. Cancelling it will flag it as needing a refund — record the reference once the money is actually back.",
  notAvailableText:
    "No action is available on this order right now: the API only accepts each transition from the statuses listed in the audit (§13).",
};

/**
 * Tier 1 back-office order detail.
 *
 * The action set is `lib/order-rules.ts` — a transcription of the entity's guards — so a button is only
 * rendered when the API would accept the call: `processing` from `paid`, `ship` from `paid|processing`,
 * `deliver` from `shipped`, `cancel` from anything not yet dispatched, and `refund` only for a
 * cancelled, paid order without a reference. Each button also has its own permission, because
 * fulfilment, cancellation and refunds are three different jobs.
 */
export default function AdminOrderDetailUI({
  order,
  permissions,
  busy,
  form,
  errorMessage,
  successMessage,
  messages,
  translations = {},
  callbacks,
}: AdminOrderDetailUIProps) {
  const t = { ...defaultTranslations, ...translations };

  const showProcessing = permissions.canFulfill && canMarkProcessing(order);
  const showShip = permissions.canFulfill && canShip(order);
  const showDeliver = permissions.canFulfill && canDeliver(order);
  const showCancel = permissions.canCancel && canCancel(order);
  const showRefund = permissions.canRefund && canRecordRefund(order);
  const anything = showProcessing || showShip || showDeliver || showCancel || showRefund;

  return (
    <div className="space-y-6">
      <OrderViewUI order={order} />

      <section className="space-y-4 rounded-lg border border-border p-4" data-testid="admin-order-actions">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{t.actionsHeading}</h2>

        {errorMessage && (
          <p className="text-sm text-destructive" data-testid="admin-order-action-error">
            {errorMessage}
          </p>
        )}
        {successMessage && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400" data-testid="admin-order-action-success">
            {successMessage}
          </p>
        )}

        {!anything && <p className="text-xs text-muted-foreground">{t.notAvailableText}</p>}

        <div className="flex flex-wrap items-start gap-6">
          {showProcessing && (
            <Button type="button" size="sm" disabled={busy} onClick={callbacks.onProcessing}>
              {busy ? t.busyText : t.processingText}
            </Button>
          )}

          {showShip && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="order-carrier">{t.carrierLabel}</Label>
                  <Input
                    id="order-carrier"
                    data-testid="order-carrier"
                    className="w-40"
                    value={form.carrier}
                    onChange={(event) => callbacks.onCarrierChange(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="order-tracking">{t.trackingLabel}</Label>
                  <Input
                    id="order-tracking"
                    data-testid="order-tracking"
                    className="w-48"
                    value={form.tracking}
                    onChange={(event) => callbacks.onTrackingChange(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !form.carrier.trim() || !form.tracking.trim()}
                  onClick={() => callbacks.onShip(form.carrier, form.tracking)}
                >
                  {busy ? t.busyText : t.shipText}
                </Button>
              </div>
            </div>
          )}

          {showDeliver && (
            <Button type="button" size="sm" disabled={busy} onClick={callbacks.onDeliver}>
              {busy ? t.busyText : t.deliverText}
            </Button>
          )}

          {showCancel && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="order-cancel-reason">{t.cancelReasonLabel}</Label>
                  <Input
                    id="order-cancel-reason"
                    data-testid="order-cancel-reason"
                    className="w-56"
                    value={form.cancelReason}
                    onChange={(event) => callbacks.onCancelReasonChange(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || !form.cancelReason.trim()}
                  onClick={() => callbacks.onCancel(form.cancelReason)}
                >
                  {busy ? t.busyText : t.cancelText}
                </Button>
              </div>
              {willRefundOnCancel(order) && (
                <p
                  className="max-w-xl text-xs text-amber-700 dark:text-amber-400"
                  data-testid="cancel-refund-warning"
                >
                  {t.refundWarning}
                </p>
              )}
            </div>
          )}

          {showRefund && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="order-refund-reference">{t.refundReferenceLabel}</Label>
                <Input
                  id="order-refund-reference"
                  data-testid="order-refund-reference"
                  className="w-56"
                  value={form.refundReference}
                  onChange={(event) => callbacks.onRefundReferenceChange(event.target.value)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={busy || !form.refundReference.trim()}
                onClick={() => callbacks.onRefund(form.refundReference)}
              >
                {busy ? t.busyText : t.refundText}
              </Button>
            </div>
          )}
        </div>
      </section>

      {messages}
    </div>
  );
}
