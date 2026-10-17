import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toApiError, type ApiError } from "@/lib/api-error";
import { cartKeys } from "@/data/query-keys";
import { cartMutationKeys, mutateCart } from "./_cartMutation";
import type { Cart, CartLineCreateRequest } from "@/lib/types/order";

/**
 * `POST /api/carts/{cart_id}/lines/` — adds stock to a line.
 *
 * Adding a SKU that is already in the cart **merges into the existing line** instead of creating a
 * second one, and the response is the whole cart, so the UI never adds the quantities up itself.
 *
 * Failures the caller has to surface: `422 field=quantity` (quantity below 1, or above
 * `available_stock`) and `404 RESOURCE_NOT_FOUND` (a SKU id that no longer exists).
 */
export function useAddCartLine(options?: { onSuccess?: (cart: Cart) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<Cart, ApiError, { cartId: string; line: CartLineCreateRequest }>({
    mutationFn: ({ cartId, line }) =>
      mutateCart(cartId, { url: `/carts/${cartId}/lines/`, method: "POST", data: line }),
    onSuccess: (cart, { cartId }) => {
      const keys = cartMutationKeys(cartId);
      queryClient.setQueryData(keys.cart, cart);
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
      options?.onSuccess?.(cart);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useAddCartLine;
