"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPriceCents } from "@/lib/types/catalog";
import { hasCheckoutErrors, type CheckoutFormErrors, type CheckoutFormValues } from "@/lib/order-rules";
import type { Cart, DeliveryOption } from "@/lib/types/order";

export interface CheckoutFormTranslations {
  heading: string;
  contactHeading: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  addressHeading: string;
  cityLabel: string;
  addressLabel: string;
  postalCodeLabel: string;
  deliveryHeading: string;
  deliveryCityHint: string;
  deliveryNoneText: string;
  deliveryLoadingText: string;
  subtotalLabel: string;
  deliveryFeeLabel: string;
  totalLabel: string;
  submitText: string;
  submittingText: string;
  mockPaymentNotice: string;
}

export interface CheckoutFormCallbacks {
  onChange: (values: CheckoutFormValues) => void;
  onSubmit: () => void;
}

export interface CheckoutFormUIProps {
  cart: Cart;
  values: CheckoutFormValues;
  errors: CheckoutFormErrors;
  deliveryOptions: DeliveryOption[];
  deliveriesLoading: boolean;
  /** `true` when the API answered `422 field=city` — the delivery table has no row for that city. */
  cityUnsupported: boolean;
  submitting: boolean;
  submitError?: string | null;
  translations?: Partial<CheckoutFormTranslations>;
  callbacks: CheckoutFormCallbacks;
}

const defaultTranslations: CheckoutFormTranslations = {
  heading: "Checkout",
  contactHeading: "Contact",
  nameLabel: "Name",
  emailLabel: "Email",
  phoneLabel: "Phone (optional)",
  addressHeading: "Delivery address",
  cityLabel: "City",
  addressLabel: "Address",
  postalCodeLabel: "Postal code",
  deliveryHeading: "Delivery method",
  deliveryCityHint: "Delivery is priced per city — type yours to see the options.",
  deliveryNoneText: "No delivery method available for this city yet.",
  deliveryLoadingText: "Loading delivery options...",
  subtotalLabel: "Items",
  deliveryFeeLabel: "Delivery",
  totalLabel: "Total",
  submitText: "Place the order",
  submittingText: "Placing...",
  mockPaymentNotice:
    "Placing the order reserves the stock and opens a 30-minute payment window. This backend uses a mock payment provider, so the next screen plays the provider's callback back to the API.",
};

/**
 * Tier 1 checkout form.
 *
 * The field set and its validation mirror `CheckoutCreate` + `OrderEntity.create` exactly (the same
 * required strings and email pattern), so the client can catch what the API would reject — and the
 * delivery method is a **select fed by the API's own delivery table for the typed city**, because the
 * backend refuses a city/method pair it does not know (`422 field=delivery_method`).
 */
export default function CheckoutFormUI({
  cart,
  values,
  errors,
  deliveryOptions,
  deliveriesLoading,
  cityUnsupported,
  submitting,
  submitError,
  translations = {},
  callbacks,
}: CheckoutFormUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const selected = deliveryOptions.find((option) => option.method === values.deliveryMethod);
  const deliveryFee = selected?.fee_cents ?? 0;

  const field = (key: keyof CheckoutFormValues) => ({
    value: values[key],
    "aria-invalid": Boolean(errors[key]),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      callbacks.onChange({ ...values, [key]: event.target.value }),
  });

  return (
    <form
      className="space-y-6"
      data-testid="checkout-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!hasCheckoutErrors(errors)) callbacks.onSubmit();
      }}
    >
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.heading}</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{t.contactHeading}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="checkout-name">{t.nameLabel}</Label>
            <Input id="checkout-name" data-testid="checkout-name" {...field("contactName")} />
            {errors.contactName && <p className="text-xs text-destructive">{errors.contactName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checkout-email">{t.emailLabel}</Label>
            <Input id="checkout-email" data-testid="checkout-email" {...field("contactEmail")} />
            {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checkout-phone">{t.phoneLabel}</Label>
            <Input id="checkout-phone" data-testid="checkout-phone" {...field("contactPhone")} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{t.addressHeading}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="checkout-city">{t.cityLabel}</Label>
            <Input id="checkout-city" data-testid="checkout-city" {...field("city")} />
            {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checkout-address">{t.addressLabel}</Label>
            <Input id="checkout-address" data-testid="checkout-address" {...field("addressLine1")} />
            {errors.addressLine1 && <p className="text-xs text-destructive">{errors.addressLine1}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checkout-postal">{t.postalCodeLabel}</Label>
            <Input id="checkout-postal" data-testid="checkout-postal" {...field("postalCode")} />
            {errors.postalCode && <p className="text-xs text-destructive">{errors.postalCode}</p>}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{t.deliveryHeading}</h2>
        <p className="text-xs text-muted-foreground">{t.deliveryCityHint}</p>

        {deliveriesLoading ? (
          <p className="text-xs text-muted-foreground" data-testid="delivery-loading">
            {t.deliveryLoadingText}
          </p>
        ) : cityUnsupported ? (
          <p className="text-xs text-amber-700 dark:text-amber-400" data-testid="delivery-unsupported">
            {`We do not deliver to "${values.city}" yet.`}
          </p>
        ) : deliveryOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground" data-testid="delivery-empty">
            {t.deliveryNoneText}
          </p>
        ) : (
          <div className="space-y-2" data-testid="delivery-options">
            {deliveryOptions.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
                htmlFor={`delivery-${option.method}`}
              >
                <input
                  type="radio"
                  id={`delivery-${option.method}`}
                  name="delivery-method"
                  value={option.method}
                  checked={values.deliveryMethod === option.method}
                  onChange={() => callbacks.onChange({ ...values, deliveryMethod: option.method })}
                />
                <span className="text-foreground">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {formatPriceCents(option.fee_cents)}
                </span>
              </label>
            ))}
          </div>
        )}
        {errors.deliveryMethod && <p className="text-xs text-destructive">{errors.deliveryMethod}</p>}
      </section>

      <section className="space-y-2 rounded-lg border border-border p-4">
        <dl className="space-y-1 text-xs text-muted-foreground" data-testid="checkout-totals">
          <div className="flex justify-between gap-4">
            <dt>{t.subtotalLabel}</dt>
            <dd>{formatPriceCents(cart.total_price_cents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>{t.deliveryFeeLabel}</dt>
            <dd>{selected ? formatPriceCents(deliveryFee) : "—"}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-border pt-1 text-sm text-foreground">
            <dt>{t.totalLabel}</dt>
            <dd data-testid="checkout-total">
              {formatPriceCents(cart.total_price_cents + deliveryFee)}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">{t.mockPaymentNotice}</p>
      </section>

      {submitError && (
        <p className="text-sm text-destructive" data-testid="checkout-error">
          {submitError}
        </p>
      )}

      <Button type="submit" disabled={submitting || cart.lines.length === 0}>
        {submitting ? t.submittingText : t.submitText}
      </Button>
    </form>
  );
}
