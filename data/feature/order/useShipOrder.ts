import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@/lib/api-error";
import { orderTransition } from "./_orderAction";
import type { Order, OrderShipRequest } from "@/lib/types/order";

/**
 * `POST /api/orders/{order_id}/ship`
 *
 * **`orders:fulfill`** — dispatches a `paid` or `processing` order with a carrier and tracking reference, and asks the backend to dispatch the customer's notice.
 */
export function useShipOrder(options?: { onSuccess?: (order: Order) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<Order, ApiError, { orderId: string; data?: OrderShipRequest }>({
    ...orderTransition(queryClient, "/ship", options),
  });
}

export default useShipOrder;
