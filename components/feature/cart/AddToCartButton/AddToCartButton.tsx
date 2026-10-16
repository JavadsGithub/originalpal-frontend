"use client";

import { useState } from "react";
import useCreateCart from "@/data/feature/cart/useCreateCart";
import useAddCartLine from "@/data/feature/cart/useAddCartLine";
import useGetCart from "@/data/feature/cart/useGetCart";
import { getStoredCartId } from "@/lib/cart-storage";
import { toApiError, type ApiError } from "@/lib/api-error";
import type { Cart } from "@/lib/types/order";
import AddToCartButtonUI from "./index";

export interface AddToCartButtonProps {
  skuId: string;
  available: boolean;
  availableStock: number;
}

/**
 * Tier 2 injector for add-to-cart.
 *
 * The cart id lives in `localStorage` (a guest cart has no session — see `lib/cart-storage.ts`), and it
 * is created lazily: the first add mints the cart, then writes the line into it. Both steps answer with
 * the whole cart, so the "in the cart" number is the API's quantity for that SKU, never a local count.
 */
export default function AddToCartButton({ skuId, available, availableStock }: AddToCartButtonProps) {
  const [cartId, setCartId] = useState<string | null>(() => getStoredCartId());
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createCart = useCreateCart();
  const addLine = useAddCartLine();
  const { cart } = useGetCart(cartId);

  const current = added ?? cart;
  const addedQuantity = current?.lines.find((line) => line.sku_id === skuId)?.quantity ?? 0;

  const handleAdd = () => {
    setError(null);

    const write = (id: string) =>
      addLine.mutate(
        { cartId: id, line: { sku_id: skuId, quantity } },
        {
          onSuccess: (updated) => {
            setAdded(updated);
            setQuantity(1);
          },
          onError: (mutationError: ApiError) => setError(mutationError.message),
        },
      );

    if (cartId) {
      write(cartId);
      return;
    }

    createCart.mutate(undefined, {
      onSuccess: (created) => {
        setCartId(created.id);
        write(created.id);
      },
      onError: (mutationError) => setError(toApiError(mutationError).message),
    });
  };

  return (
    <AddToCartButtonUI
      available={available}
      availableStock={availableStock}
      quantity={quantity}
      submitting={createCart.isPending || addLine.isPending}
      addedQuantity={addedQuantity}
      errorMessage={error}
      callbacks={{ onQuantityChange: setQuantity, onAdd: handleAdd }}
    />
  );
}
