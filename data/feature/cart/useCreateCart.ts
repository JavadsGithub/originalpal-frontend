import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import { cartKeys } from "@/data/query-keys";
import { setStoredCartId } from "@/lib/cart-storage";
import type { Cart } from "@/lib/types/order";

/**
 * `POST /api/carts/` — creates an empty cart. Anonymous, and the only endpoint that mints one.
 *
 * The id is persisted immediately: it is the guest's only handle on the cart, and the next page load
 * would otherwise start over.
 */
export function useCreateCart(options?: { onSuccess?: (cart: Cart) => void }) {
  const queryClient = useQueryClient();

  return useMutation<Cart, ApiError, void>({
    mutationFn: () => customFetcher<Cart>({ url: "/carts/", method: "POST" }),
    onSuccess: (cart) => {
      setStoredCartId(cart.id);
      queryClient.setQueryData(cartKeys.detail(cart.id), cart);
      options?.onSuccess?.(cart);
    },
    onError: (error) => toApiError(error),
  });
}

export default useCreateCart;
