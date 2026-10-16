import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import { orderKeys } from "@/data/query-keys";
import type { OrderMessage } from "@/lib/types/order";

/**
 * `POST /api/orders/{order_id}/messages/{message_id}/retry` — **`orders:read`** — re-sends one failed
 * notification and answers with the message's new state (`attempt_count` goes up).
 *
 * The guard is server-side: only a `failed` message can be retried, so anything else is an error the
 * UI should not offer.
 */
export function useRetryOrderMessage(options?: { onSuccess?: (message: OrderMessage) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<OrderMessage, ApiError, { orderId: string; messageId: string }>({
    mutationFn: ({ orderId, messageId }) =>
      customFetcher<OrderMessage>({
        url: `/orders/${orderId}/messages/${messageId}/retry`,
        method: "POST",
      }),
    onSuccess: (message, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.admin.messages(variables.orderId) });
      options?.onSuccess?.(message);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useRetryOrderMessage;
