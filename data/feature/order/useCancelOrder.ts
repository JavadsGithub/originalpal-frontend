import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@/lib/api-error";
import { orderTransition } from "./_orderAction";
import type { Order, OrderCancelRequest } from "@/lib/types/order";

/**
 * `POST /api/orders/{order_id}/cancel`
 *
 * **`orders:cancel`** — cancels anything that has not shipped. Cancelling a **paid** order sets `refund_required`, which is what makes `record_refund` possible afterwards.
 */
export function useCancelOrder(options?: { onSuccess?: (order: Order) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<Order, ApiError, { orderId: string; data?: OrderCancelRequest }>({
    ...orderTransition(queryClient, "/cancel", options),
  });
}

export default useCancelOrder;
