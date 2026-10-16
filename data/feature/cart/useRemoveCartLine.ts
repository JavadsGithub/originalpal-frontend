import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toApiError, type ApiError } from "@/lib/api-error";
import { cartKeys } from "@/data/query-keys";
import { mutateCart } from "./_cartMutation";
import type { Cart } from "@/lib/types/order";

/**
 * `DELETE /api/carts/{cart_id}/lines/{line_id}` — drops one line and answers with the whole cart.
 *
 * Deleting the last line leaves an **empty cart**, not a 404: the cart itself is only removed when the
 * backend cleans it up, so the UI keeps showing an empty basket with an invitation to shop.
 */
export function useRemoveCartLine(options?: { onSuccess?: (cart: Cart) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<Cart, ApiError, { cartId: string; lineId: string }>({
    mutationFn: ({ cartId, lineId }) =>
      mutateCart(cartId, { url: `/carts/${cartId}/lines/${lineId}`, method: "DELETE" }),
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.detail(cart.id), cart);
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
      options?.onSuccess?.(cart);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useRemoveCartLine;
