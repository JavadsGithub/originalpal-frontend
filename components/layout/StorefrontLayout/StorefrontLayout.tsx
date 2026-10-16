"use client";

import { useState } from "react";
import useGetHomepage from "@/data/feature/storefront/useGetHomepage";
import useGetCart from "@/data/feature/cart/useGetCart";
import { getStoredCartId } from "@/lib/cart-storage";
import StorefrontLayoutUI from "./index";

/**
 * Tier 2 injector for the storefront shell.
 *
 * Two things come from the API: the navigation that `GET /api/homepage/` returns, and the number of
 * lines in this browser's cart (read once per mount; the cart pages keep the cache in step, so the
 * header follows along). Both are rendered empty-safe — a shell that hides its menu or its cart link
 * because a request failed is still a usable storefront, whereas one that throws is not.
 */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [cartId] = useState<string | null>(() => getStoredCartId());
  const { navigation } = useGetHomepage();
  const { cart } = useGetCart(cartId);

  return (
    <StorefrontLayoutUI navigation={navigation} cartCount={cart?.lines.length ?? 0}>
      {children}
    </StorefrontLayoutUI>
  );
}
