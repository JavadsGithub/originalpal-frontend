import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toApiError, type ApiError } from "@/lib/api-error";
import { cartKeys } from "@/data/query-keys";
import { mutateCart } from "./_cartMutation";
import type { Cart, CartLineUpdateRequest } from "@/lib/types/order";

/**
 * `PUT /api/carts/{cart_id}/lines/{line_id}` — sets an absolute quantity.
 *
 * `quantity: 0` is refused (`422 field=quantity`) — removing a line is its own endpoint — and the same
 * validation as `POST` applies against the SKU's available stock at that moment.
 */
export function useUpdateCartLine(options?: { onSuccess?: (cart: Cart) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<Cart, ApiError, { cartId: string; lineId: string; update: CartLineUpdateRequest }>({
    mutationFn: ({ cartId, lineId, update }) =>
      mutateCart(cartId, { url: `/carts/${cartId}/lines/${lineId}`, method: "PUT", data: update }),
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKeys.detail(cart.id), cart);
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
      options?.onSuccess?.(cart);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useUpdateCartLine;
