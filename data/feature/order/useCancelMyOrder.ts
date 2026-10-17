import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import { orderKeys } from "@/data/query-keys";
import type { Order } from "@/lib/types/order";

/**
 * `POST /api/me/orders/{order_id}/cancel` — the customer cancels their own order.
 *
 * Allowed from any status except `shipped`/`delivered` (`422 field=status`), which the UI must not
 * offer. Cancelling a **paid** order sets `refund_required` — the money does not move here, an
 * operator records the refund later.
 */
export function useCancelMyOrder(options?: { onSuccess?: (order: Order) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<Order, ApiError, { orderId: string; reason: string }>({
    mutationFn: ({ orderId, reason }) =>
      customFetcher<Order>({ url: `/me/orders/${orderId}/cancel`, method: "POST", data: { reason } }),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.mineDetail(order.id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      options?.onSuccess?.(order);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useCancelMyOrder;
