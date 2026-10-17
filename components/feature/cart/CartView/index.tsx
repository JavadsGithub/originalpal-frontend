"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPriceCents } from "@/lib/types/catalog";
import { cartLineProblem, formatLineTotal } from "@/lib/order-rules";
import type { Cart } from "@/lib/types/order";
import Link from "next/link";

export interface CartViewTranslations {
  heading: string;
  emptyState: string;
  continueShoppingText: string;
  linesHeading: string;
  quantityLabel: string;
  removeText: string;
  subtotalLabel: string;
  deliveryNotice: string;
  checkoutText: string;
  unavailableNotice: string;
  cartIdLabel: string;
}

export interface CartViewCallbacks {
  onQuantityChange: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
  onCheckout: () => void;
}

export interface CartViewUIProps {
  cart: Cart;
  /** Set while a line mutation is in flight — the API answers with a new cart each time. */
  busy: boolean;
  errorMessage?: string | null;
  translations?: Partial<CartViewTranslations>;
  callbacks: CartViewCallbacks;
}

const defaultTranslations: CartViewTranslations = {
  heading: "Your cart",
  emptyState: "Your cart is empty.",
  continueShoppingText: "Browse products",
  linesHeading: "Items",
  quantityLabel: "Quantity",
  removeText: "Remove",
  subtotalLabel: "Subtotal",
  deliveryNotice:
    "Delivery is chosen at checkout: the fee depends on the city, and the total you see here excludes it.",
  checkoutText: "Checkout",
  unavailableNotice: "This line cannot be checked out as it stands:",
  cartIdLabel: "Cart",
};

/**
 * Tier 1 cart.
 *
 * Two API facts are visible in the markup: every line carries the price **as it was when it was added**
 * (`unit_price_cents`, so a stale price is shown rather than silently re-priced), and availability is
 * the server's own `is_available` / `available_stock` — a line whose stock ran out blocks checkout
 * here instead of failing with `422 field=quantity` at the next step.
 */
export default function CartViewUI({
  cart,
  busy,
  errorMessage,
  translations = {},
  callbacks,
}: CartViewUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const problems = cart.lines.filter((line) => cartLineProblem(line) !== null);
  const canCheckout = cart.lines.length > 0 && problems.length === 0;

  return (
    <section className="space-y-5" data-testid="cart-view">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.heading}</h1>
        <p className="font-mono text-xs text-muted-foreground">
          {t.cartIdLabel}: {cart.id}
        </p>
      </header>

      {errorMessage && (
        <p className="text-sm text-destructive" data-testid="cart-error">
          {errorMessage}
        </p>
      )}

      {cart.lines.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground" data-testid="cart-empty">
            {t.emptyState}
          </p>
          <Link href="/search" className="text-sm font-semibold text-foreground hover:underline">
            {t.continueShoppingText} →
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-lg border border-border" data-testid="cart-lines">
            {cart.lines.map((line) => {
              const problem = cartLineProblem(line);

              return (
                <li
                  key={line.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  data-testid={`cart-line-${line.sku_id}`}
                >
                  <div className="space-y-0.5">
                    <p className="font-mono text-xs text-muted-foreground">{line.sku_id.slice(0, 8)}</p>
                    <p className="text-sm text-foreground">{formatLineTotal(line)}</p>
                    {problem && (
                      <p className="text-xs text-amber-700 dark:text-amber-400" data-testid={`cart-line-problem-${line.sku_id}`}>
                        {problem}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground" htmlFor={`cart-quantity-${line.id}`}>
                      {t.quantityLabel}
                    </label>
                    <Input
                      id={`cart-quantity-${line.id}`}
                      type="number"
                      min={1}
                      max={Math.max(1, line.available_stock)}
                      value={line.quantity}
                      disabled={busy}
                      className="w-20"
                      onChange={(event) => callbacks.onQuantityChange(line.id, Number(event.target.value))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => callbacks.onRemove(line.id)}
                    >
                      {t.removeText}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-foreground" data-testid="cart-subtotal">
                {t.subtotalLabel}: <strong>{formatPriceCents(cart.total_price_cents)}</strong>
              </p>
              <p className="max-w-lg text-xs text-muted-foreground">{t.deliveryNotice}</p>
            </div>

            <div className="space-y-1 text-right">
              {!canCheckout && (
                <p className="text-xs text-amber-700 dark:text-amber-400" data-testid="cart-blocked">
                  {t.unavailableNotice} {problems.length}
                </p>
              )}
              <Button type="button" disabled={!canCheckout || busy} onClick={callbacks.onCheckout}>
                {t.checkoutText}
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
