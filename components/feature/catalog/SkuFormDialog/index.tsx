"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPriceCents, parsePriceToCents } from "@/lib/types/catalog";

export type SkuFormMode = "create" | "edit";

export interface SkuFormValues {
  code: string;
  /** `${key}=${value}` per line — the backend stores `dict[str, str]`. */
  optionValues: Record<string, string>;
  priceCents: number;
  /** Only sent on create; afterwards stock moves through stock adjustments. */
  stockQuantity: number;
  isActive: boolean;
}

export interface SkuFormDialogTranslations {
  createTitle: string;
  editTitle: string;
  createDescription: string;
  editDescription: string;
  codeLabel: string;
  optionsLabel: string;
  optionsHint: string;
  priceLabel: string;
  stockLabel: string;
  stockHint: string;
  activeLabel: string;
  startInactiveHint: string;
  priceError: string;
  optionsError: string;
  submitCreate: string;
  submitEdit: string;
  submitting: string;
  cancel: string;
  stockIsAdjustmentNotice: string;
}

export interface SkuFormDialogCallbacks {
  onSubmit: (values: SkuFormValues) => void;
  onCancel: () => void;
}

export interface SkuFormDialogUIProps {
  mode: SkuFormMode;
  initialValues?: Partial<SkuFormValues & { priceInput: string }>;
  submitting?: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  translations?: Partial<SkuFormDialogTranslations>;
  callbacks: SkuFormDialogCallbacks;
}

const defaultTranslations: SkuFormDialogTranslations = {
  createTitle: "New SKU",
  editTitle: "Edit SKU",
  createDescription: "A product needs at least one active SKU before it can be published.",
  editDescription: "Stock is not edited here — use a stock adjustment so the change is traceable.",
  codeLabel: "Code",
  optionsLabel: "Options",
  optionsHint: "One `key=value` per line, e.g. `size=M`. They must differ between SKUs of a product.",
  priceLabel: "Price",
  stockLabel: "Initial stock",
  stockHint: "Opening quantity; later changes go through stock adjustments.",
  activeLabel: "Active",
  startInactiveHint: "An inactive SKU does not count towards publication.",
  priceError: "Enter an amount greater than zero (for example 129.90).",
  optionsError: "Use one `key=value` pair per line.",
  submitCreate: "Create SKU",
  submitEdit: "Save changes",
  submitting: "Saving...",
  cancel: "Cancel",
  stockIsAdjustmentNotice: "",
};

/**
 * Tier 1 pure UI for SKUs.
 *
 * Two backend rules the form has to respect: `price_cents` must be > 0 (else `422 VALIDATION_ERROR`
 * with field `price_cents`) and stock is an *adjustment* concept — the edit mode therefore hides the
 * opening quantity and points at the stock dialog instead.
 */
export default function SkuFormDialogUI({
  mode,
  initialValues,
  submitting = false,
  errorMessage = null,
  fieldErrors = {},
  translations = {},
  callbacks,
}: SkuFormDialogUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const isCreate = mode === "create";

  const [code, setCode] = useState(initialValues?.code ?? "");
  const [optionsText, setOptionsText] = useState(
    Object.entries(initialValues?.optionValues ?? {})
      .map(([key, value]) => `${key}=${value}`)
      .join("\n"),
  );
  const [priceInput, setPriceInput] = useState(
    initialValues?.priceInput ??
      (typeof initialValues?.priceCents === "number"
        ? (initialValues.priceCents / 100).toFixed(2)
        : ""),
  );
  const [stockQuantity, setStockQuantity] = useState(initialValues?.stockQuantity ?? 0);
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);
  const [showLocalErrors, setShowLocalErrors] = useState(false);

  const parsedOptions = parseOptions(optionsText);
  const parsedPrice = parsePriceToCents(priceInput);

  const localErrors: Record<string, string> = {};
  if (!parsedPrice.ok) localErrors.price_cents = t.priceError;
  if (optionsText.trim().length > 0 && !parsedOptions.ok) localErrors.option_values = t.optionsError;

  const errors = { ...(showLocalErrors ? localErrors : {}), ...fieldErrors };

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
            disabled={submitting}
            onClick={callbacks.onCancel}
          >
            {t.cancel}
          </Button>
          <Button
            type="submit"
            form="sku-form"
            size="sm"
            disabled={submitting || code.trim().length === 0}
          >
            {submitting ? t.submitting : isCreate ? t.submitCreate : t.submitEdit}
          </Button>
        </>
      }
    >
      <form
        id="sku-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();

          if (Object.keys(localErrors).length > 0) {
            setShowLocalErrors(true);
            return;
          }

          callbacks.onSubmit({
            code: code.trim(),
            optionValues: parsedOptions.values,
            priceCents: parsedPrice.cents,
            stockQuantity,
            isActive,
          });
        }}
      >
        <FormError message={errorMessage} />

        <div className="space-y-1.5">
          <Label htmlFor="sku-code">{t.codeLabel}</Label>
          <Input
            id="sku-code"
            value={code}
            disabled={submitting}
            aria-invalid={Boolean(errors.code)}
            onChange={(event) => setCode(event.target.value)}
          />
          {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sku-options">{t.optionsLabel}</Label>
          <textarea
            id="sku-options"
            rows={3}
            value={optionsText}
            disabled={submitting}
            aria-invalid={Boolean(errors.option_values)}
            onChange={(event) => setOptionsText(event.target.value)}
            className="flex w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
          <p className="text-xs text-muted-foreground">{t.optionsHint}</p>
          {errors.option_values && (
            <p className="text-xs text-destructive">{errors.option_values}</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sku-price">{t.priceLabel}</Label>
            <Input
              id="sku-price"
              inputMode="decimal"
              value={priceInput}
              disabled={submitting}
              aria-invalid={Boolean(errors.price_cents)}
              onChange={(event) => setPriceInput(event.target.value)}
            />
            {parsedPrice.ok && (
              <p className="text-xs text-muted-foreground">{formatPriceCents(parsedPrice.cents)}</p>
            )}
            {errors.price_cents && (
              <p className="text-xs text-destructive">{errors.price_cents}</p>
            )}
          </div>

          {isCreate && (
            <div className="space-y-1.5">
              <Label htmlFor="sku-stock">{t.stockLabel}</Label>
              <Input
                id="sku-stock"
                type="number"
                min={0}
                value={stockQuantity}
                disabled={submitting}
                onChange={(event) => setStockQuantity(Number(event.target.value))}
              />
              <p className="text-xs text-muted-foreground">{t.stockHint}</p>
            </div>
          )}
        </div>

        {!isCreate && (
          <div className="space-y-1.5 rounded-md border border-border p-3">
            <Checkbox
              id="sku-active"
              label={t.activeLabel}
              checked={isActive}
              disabled={submitting}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            {!isActive && <p className="text-xs text-muted-foreground">{t.startInactiveHint}</p>}
          </div>
        )}
      </form>
    </Dialog>
  );
}

/** `"size=M\ncolor=red"` → `{ ok: true, values: { size: "M", color: "red" } }`. */
export function parseOptions(input: string): { ok: boolean; values: Record<string, string> } {
  const values: Record<string, string> = {};

  for (const line of input.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const separator = trimmed.indexOf("=");
    if (separator <= 0) return { ok: false, values };

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!key || !value) return { ok: false, values };

    values[key] = value;
  }

  return { ok: true, values };
}
