import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toApiError, type ApiError } from "@/lib/api-error";
import { orderTransition } from "./_orderAction";
import type { Order } from "@/lib/types/order";

/**
 * `POST /api/orders/{order_id}/processing`
 *
 * **`orders:fulfill`** — moves a `paid` order to `processing` (nothing else is accepted).
 */
export function useMarkOrderProcessing(options?: { onSuccess?: (order: Order) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<Order, ApiError, { orderId: string; data?: never }>({
    ...orderTransition(queryClient, "/processing", options),
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useMarkOrderProcessing;
