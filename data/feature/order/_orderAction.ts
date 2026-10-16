import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import { orderKeys } from "@/data/query-keys";
import type { QueryClient } from "@tanstack/react-query";
import type { Order } from "@/lib/types/order";

/**
 * Shared body for the six back-office order transitions.
 *
 * Every one of them answers with the updated order, so the cache is written directly and the lists are
 * invalidated. Each is also a **guard on the server**: an illegal transition is `422 field=status`
 * ("Dispatched orders cannot be cancelled", "Only paid orders can be marked processing", …), which the
 * UI avoids by asking `lib/order-rules.ts` first.
 */
export function orderTransition(
  queryClient: QueryClient,
  path: string,
  options?: { onSuccess?: (order: Order) => void; onError?: (error: ApiError) => void },
) {
  return {
    mutationFn: (variables: { orderId: string; data?: unknown }) =>
      customFetcher<Order>({
        url: `/orders/${variables.orderId}${path}`,
        method: "POST",
        // `processing` and `deliver` take no body at all; the schemas that do forbid unknown fields.
        data: variables.data ?? {},
      }),
    onSuccess: (order: Order) => {
      queryClient.setQueryData(orderKeys.admin.detail(order.id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.admin.all() });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      options?.onSuccess?.(order);
    },
    onError: (error: unknown) => options?.onError?.(toApiError(error)),
  };
}
