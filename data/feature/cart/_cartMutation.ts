import { customFetcher } from "@/lib/fetcher";
import type { Cart } from "@/lib/types/order";
import { cartKeys, orderKeys } from "@/data/query-keys";

/**
 * Writes a cart mutation and files the API's own response under the cart's key.
 *
 * Every cart endpoint answers with the **whole cart**, so there is nothing to re-read afterwards: the
 * response replaces the cache entry directly. The cart is a server-side price book, so re-fetching it
 * would only risk showing a different price than the one just written.
 */
export async function mutateCart(
  cartId: string,
  request: { url: string; method: "POST" | "PUT" | "DELETE"; data?: unknown },
): Promise<Cart> {
  return customFetcher<Cart>({
    url: request.url,
    method: request.method,
    data: request.data,
  });
}

export function cartMutationKeys(cartId: string) {
  return {
    cart: cartKeys.detail(cartId),
    // A new line can change what an order shows, and a cart that just changed invalidates the order
    // list's totals — cheap to invalidate, and it keeps the two screens consistent.
    orders: orderKeys.all,
  };
}
