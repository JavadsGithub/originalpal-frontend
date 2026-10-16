import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import { orderKeys } from "@/data/query-keys";
import type { Order } from "@/lib/types/order";

/**
 * `POST /api/orders/{order_id}/guest-cancel` — a guest cancels with the access token they hold.
 *
 * Unauthenticated, so the token *is* the authorisation: a wrong one answers `404`, never `403`.
 * Same guard rails as the customer path — anything not dispatched may be cancelled, and a paid order
 * comes back with `refund_required: true`.
 */
export function useCancelGuestOrder(options?: { onSuccess?: (order: Order) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<Order, ApiError, { orderId: string; guestAccessToken: string; reason: string }>({
    mutationFn: ({ orderId, guestAccessToken, reason }) =>
      customFetcher<Order>({
        url: `/orders/${orderId}/guest-cancel`,
        method: "POST",
        data: { guest_access_token: guestAccessToken, reason },
      }),
    onSuccess: (order) => {
      // The guest read is keyed by order id *and* whether a token was used, so the whole `guest`
      // prefix is invalidated rather than one exact cache entry; the page's own override renders the
      // returned order immediately, so the refetch is only a reconciliation.
      queryClient.invalidateQueries({ queryKey: orderKeys.guest(order.id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      options?.onSuccess?.(order);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useCancelGuestOrder;
