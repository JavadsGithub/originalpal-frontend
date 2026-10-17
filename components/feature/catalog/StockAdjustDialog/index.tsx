"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface StockAdjustmentRow {
  id: string;
  quantityDelta: number;
  reason: string;
  stockAfter: number;
  createdAt: string;
}

export interface StockAdjustDialogTranslations {
  title: string;
  description: string;
  currentStockLabel: string;
  deltaLabel: string;
  deltaHint: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  submitButtonText: string;
  submittingLabel: string;
  cancelButtonText: string;
  historyTitle: string;
  historyEmpty: string;
  historyReasonHeader: string;
  historyDeltaHeader: string;
  historyAfterHeader: string;
  historyDateHeader: string;
  deltaError: string;
  reasonError: string;
  historyNeedsPermission: string;
}

export interface StockAdjustDialogCallbacks {
  onSubmit: (values: { quantityDelta: number; reason: string }) => void;
  onCancel: () => void;
}

export interface StockAdjustDialogUIProps {
  skuCode: string;
  currentStock: number;
  reservedQuantity: number;
  adjustments: StockAdjustmentRow[];
  submitting?: boolean;
  canReadHistory: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  translations?: Partial<StockAdjustDialogTranslations>;
  callbacks: StockAdjustDialogCallbacks;
}

const defaultTranslations: StockAdjustDialogTranslations = {
  title: "Stock adjustment",
  description:
    "Every change is recorded with a reason. Use a positive number to add stock and a negative one to remove it.",
  currentStockLabel: "On hand",
  deltaLabel: "Change",
  deltaHint: "Must be a non-zero whole number.",
  reasonLabel: "Reason",
  reasonPlaceholder: "e.g. delivery, damage, stock count",
  submitButtonText: "Apply adjustment",
  submittingLabel: "Applying...",
  cancelButtonText: "Cancel",
  historyTitle: "Recent adjustments",
  historyEmpty: "No adjustments yet.",
  historyReasonHeader: "Reason",
  historyDeltaHeader: "Change",
  historyAfterHeader: "After",
  historyDateHeader: "When",
  deltaError: "Enter a non-zero whole number.",
  reasonError: "A reason is required.",
  historyNeedsPermission: "The adjustment history requires `skus:update`.",
};

/**
 * Tier 1 pure UI for stock moves.
 *
 * Mirrors the backend's two validators plus the domain rule that stock may not go negative: a zero
 * delta or a blank reason is refused by FastAPI before the use case runs, an oversell comes back as
 * `422 VALIDATION_ERROR` with field `stock_quantity_after`.
 */
export default function StockAdjustDialogUI({
  skuCode,
  currentStock,
  reservedQuantity,
  adjustments,
  submitting = false,
  canReadHistory,
  errorMessage = null,
  fieldErrors = {},
  translations = {},
  callbacks,
}: StockAdjustDialogUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [showLocalErrors, setShowLocalErrors] = useState(false);

  const parsedDelta = Number(delta);
  const localErrors: Record<string, string> = {};
  if (!delta.trim() || !Number.isInteger(parsedDelta) || parsedDelta === 0) {
    localErrors.quantity_delta = t.deltaError;
  }
  if (reason.trim().length === 0) localErrors.reason = t.reasonError;
  if (parsedDelta < 0 && currentStock + parsedDelta < 0) {
    localErrors.quantity_delta = "Stock quantity after adjustment cannot be negative";
  }

  const errors = { ...(showLocalErrors ? localErrors : {}), ...fieldErrors };

  return (
    <Dialog
      open
      busy={submitting}
      onClose={callbacks.onCancel}
      title={`${t.title} — ${skuCode}`}
      description={t.description}
      className="w-[min(38rem,calc(100vw-2rem))]"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={callbacks.onCancel}
          >
            {t.cancelButtonText}
          </Button>
          <Button type="submit" form="stock-adjust-form" size="sm" disabled={submitting}>
            {submitting ? t.submittingLabel : t.submitButtonText}
          </Button>
        </>
      }
    >
      <div className="space-y-4" data-testid="stock-adjust-dialog">
        <FormError message={errorMessage} />

        <p className="text-xs text-muted-foreground">
          {t.currentStockLabel}: <span className="text-foreground">{currentStock}</span>
          {reservedQuantity > 0 ? ` · ${reservedQuantity} reserved` : ""}
        </p>

        <form
          id="stock-adjust-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();

            if (Object.keys(localErrors).length > 0) {
              setShowLocalErrors(true);
              return;
            }

            callbacks.onSubmit({ quantityDelta: parsedDelta, reason: reason.trim() });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stock-delta">{t.deltaLabel}</Label>
              <Input
                id="stock-delta"
                inputMode="numeric"
                value={delta}
                placeholder="+5 / -2"
                disabled={submitting}
                aria-invalid={Boolean(errors.quantity_delta)}
                onChange={(event) => setDelta(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t.deltaHint}</p>
              {errors.quantity_delta && (
                <p className="text-xs text-destructive">{errors.quantity_delta}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stock-reason">{t.reasonLabel}</Label>
              <Input
                id="stock-reason"
                value={reason}
                placeholder={t.reasonPlaceholder}
                disabled={submitting}
                aria-invalid={Boolean(errors.reason)}
                onChange={(event) => setReason(event.target.value)}
              />
              {errors.reason && <p className="text-xs text-destructive">{errors.reason}</p>}
            </div>
          </div>
        </form>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground">{t.historyTitle}</h3>

          {!canReadHistory ? (
            <p className="text-xs text-muted-foreground">{t.historyNeedsPermission}</p>
          ) : adjustments.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t.historyEmpty}</p>
          ) : (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {adjustments.map((adjustment) => (
                <li
                  key={adjustment.id}
                  className="flex items-center justify-between gap-3 rounded border border-border px-2.5 py-1.5 text-xs"
                >
                  <span className="truncate text-muted-foreground">{adjustment.reason}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span
                      className={
                        adjustment.quantityDelta > 0 ? "text-emerald-600" : "text-destructive"
                      }
                    >
                      {adjustment.quantityDelta > 0 ? "+" : ""}
                      {adjustment.quantityDelta}
                    </span>
                    <span className="text-foreground">{adjustment.stockAfter}</span>
                    <span className="text-muted-foreground">
                      {new Date(adjustment.createdAt).toLocaleString()}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Dialog>
  );
}
