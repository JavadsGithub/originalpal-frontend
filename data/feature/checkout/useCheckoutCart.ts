import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import { cartKeys, orderKeys } from "@/data/query-keys";
import { cartKeys as _cartKeys } from "@/data/query-keys";
import { rememberGuestOrderToken } from "@/lib/cart-storage";
import type { CheckoutCreateRequest, Order } from "@/lib/types/order";

/**
 * `POST /api/checkouts/` — turns a cart into an order.
 *
 * Three things the caller cannot skip:
 * * it is **idempotent per cart** — posting the same `cart_id` again returns the existing
 *   `awaiting_payment` order instead of a second one, so a double-click is harmless;
 * * it **reserves the stock**; if any step fails, the backend releases everything it reserved;
 * * the response carries the order's `guest_access_token`, which the client stores next to the order id
 *   (the confirmation page needs it, and there is no other way back into a guest order).
 *
 * Rejections worth rendering inline: `422 field=delivery_method` (city/method not supported),
 * `422 field=quantity` (a line outgrew the stock since it was added) and `422 field=cart_id` (empty
 * cart, or a product that is no longer published).
 */
export function useCheckoutCart(options?: { onSuccess?: (order: Order) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<Order, ApiError, CheckoutCreateRequest>({
    mutationFn: (data) => customFetcher<Order>({ url: "/checkouts/", method: "POST", data }),
    onSuccess: (order, variables) => {
      rememberGuestOrderToken(order.id, order.guest_access_token);
      queryClient.setQueryData(orderKeys.guest(order.id), order);
      // The cart is now an order: the basket on screen is stale by definition.
      queryClient.invalidateQueries({ queryKey: _cartKeys.all });
      queryClient.removeQueries({ queryKey: cartKeys.detail(variables.cart_id) });
      options?.onSuccess?.(order);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useCheckoutCart;
