"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useGetCart from "@/data/feature/cart/useGetCart";
import useCreateCart from "@/data/feature/cart/useCreateCart";
import useUpdateCartLine from "@/data/feature/cart/useUpdateCartLine";
import useRemoveCartLine from "@/data/feature/cart/useRemoveCartLine";
import { getStoredCartId, setStoredCartId } from "@/lib/cart-storage";
import { toApiError } from "@/lib/api-error";
import CartViewUI from "./index";

/**
 * Tier 2 injector for the cart page.
 *
 * The stored cart id may point at a cart the backend no longer has (a cleared database, an expired
 * cart): a `404` is therefore rendered as an empty cart with a "start a new one" path rather than an
 * error. Quantity edits go to the server on every change — the API re-validates them against live
 * stock and answers with the new cart, which is the only price the UI trusts.
 */
export default function CartView() {
  const router = useRouter();
  const [cartId, setCartId] = useState<string | null>(() => getStoredCartId());
  const [error, setError] = useState<string | null>(null);

  const { cart, isLoading, error: readError, refetch } = useGetCart(cartId);
  const createCart = useCreateCart();
  const updateLine = useUpdateCartLine();
  const removeLine = useRemoveCartLine();

  const busy = updateLine.isPending || removeLine.isPending || createCart.isPending;

  const handleMutationError = (mutationError: unknown) => setError(toApiError(mutationError).message);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="cart-loading">
        Loading your cart...
      </p>
    );
  }

  // A cart that the backend no longer knows about is an empty cart, not a failure.
  if (readError?.isNotFound || (!cartId && !isLoading)) {
    return (
      <div className="space-y-3 text-sm" data-testid="cart-view">
        <p className="text-muted-foreground" data-testid="cart-empty">
          {readError?.isNotFound
            ? "This cart is no longer on the server — it was either emptied and cleaned up, or the backend was reset."
            : "Your cart is empty."}
        </p>
        <button
          type="button"
          className="font-semibold text-foreground underline"
          onClick={() => {
            setStoredCartId(null);
            setCartId(null);
            setError(null);
            createCart.mutate(undefined, {
              onSuccess: (created) => setCartId(created.id),
              onError: handleMutationError,
            });
          }}
        >
          Start a new cart
        </button>
      </div>
    );
  }

  if (readError || !cart) {
    return (
      <div className="space-y-2 text-sm text-destructive" data-testid="cart-read-error">
        <p>{readError?.message ?? "Could not load the cart"}</p>
        <button type="button" className="underline" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <CartViewUI
      cart={cart}
      busy={busy}
      errorMessage={error}
      callbacks={{
        onQuantityChange: (lineId, quantity) => {
          setError(null);
          if (!cartId || quantity < 1) return;
          updateLine.mutate(
            { cartId, lineId, update: { quantity } },
            { onError: handleMutationError },
          );
        },
        onRemove: (lineId) => {
          setError(null);
          if (!cartId) return;
          removeLine.mutate({ cartId, lineId }, { onError: handleMutationError });
        },
        onCheckout: () => router.push("/checkout"),
      }}
    />
  );
}
