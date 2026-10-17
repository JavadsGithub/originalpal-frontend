import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toApiError, type ApiError } from "@/lib/api-error";
import { orderTransition } from "./_orderAction";
import type { Order } from "@/lib/types/order";

/**
 * `POST /api/orders/{order_id}/deliver`
 *
 * **`orders:fulfill`** — closes a `shipped` order.
 */
export function useDeliverOrder(options?: { onSuccess?: (order: Order) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<Order, ApiError, { orderId: string; data?: never }>({
    ...orderTransition(queryClient, "/deliver", options),
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useDeliverOrder;
