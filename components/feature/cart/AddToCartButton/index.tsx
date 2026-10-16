"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface AddToCartButtonTranslations {
  addButtonText: string;
  addingText: string;
  soldOutText: string;
  quantityLabel: string;
  inCartNotice: string;
}

export interface AddToCartButtonProps {
  /** The SKU being added; the button is disabled when the API says it cannot be bought. */
  available: boolean;
  availableStock: number;
  quantity: number;
  submitting: boolean;
  /** Set after a successful add, so the shopper sees the same SKU merge into one line. */
  addedQuantity?: number;
  errorMessage?: string | null;
  translations?: Partial<AddToCartButtonTranslations>;
  callbacks: {
    onQuantityChange: (quantity: number) => void;
    onAdd: () => void;
  };
}

const defaultTranslations: AddToCartButtonTranslations = {
  addButtonText: "Add to cart",
  addingText: "Adding...",
  soldOutText: "Sold out",
  quantityLabel: "Quantity",
  inCartNotice: "In the cart",
};

/**
 * Tier 1 add-to-cart control for one SKU.
 *
 * The quantity input is bounded by `available_stock` from the API rather than by an invented limit, and
 * the "in the cart" note matters because `POST /carts/{id}/lines/` **merges** a repeated SKU into the
 * existing line instead of adding a second row.
 */
export default function AddToCartButtonUI({
  available,
  availableStock,
  quantity,
  submitting,
  addedQuantity = 0,
  errorMessage,
  translations = {},
  callbacks,
}: AddToCartButtonProps) {
  const t = { ...defaultTranslations, ...translations };
  const max = Math.max(1, availableStock);

  return (
    <div className="space-y-1.5" data-testid="add-to-cart">
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground" htmlFor="add-to-cart-quantity">
          {t.quantityLabel}
        </label>
        <Input
          id="add-to-cart-quantity"
          type="number"
          min={1}
          max={max}
          value={quantity}
          disabled={!available || submitting}
          className="w-20"
          onChange={(event) => callbacks.onQuantityChange(Number(event.target.value))}
        />
        <Button
          type="button"
          size="sm"
          disabled={!available || submitting || quantity < 1 || quantity > availableStock}
          onClick={callbacks.onAdd}
        >
          {!available ? t.soldOutText : submitting ? t.addingText : t.addButtonText}
        </Button>
        {addedQuantity > 0 && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400" data-testid="add-to-cart-added">
            {t.inCartNotice}: {addedQuantity}
          </span>
        )}
      </div>

      {errorMessage && (
        <p className="text-xs text-destructive" data-testid="add-to-cart-error">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
