import { useQuery } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import { orderKeys } from "@/data/query-keys";
import { normalizePage, type PaginatedPayload } from "@/lib/types/api";
import type { OrderMessage } from "@/lib/types/order";

/**
 * `GET /api/orders/{order_id}/messages/` — **`orders:read`** — the notifications the backend produced
 * for an order (an order confirmation once payment succeeds, a dispatch notice when it ships).
 *
 * Messages are dispatched with `NoopMessageProvider`, so a real send cannot fail today and the list is
 * mostly a delivery log: `kind`, `status`, `attempt_count` and — for a failure — `error_message`, which
 * is what makes the retry button meaningful.
 */
export function useGetOrderMessages(orderId: string) {
  const query = useQuery<PaginatedPayload<OrderMessage>>({
    queryKey: orderKeys.admin.messages(orderId),
    enabled: Boolean(orderId),
    queryFn: () =>
      customFetcher<PaginatedPayload<OrderMessage>>({
        url: `/orders/${orderId}/messages/`,
        method: "GET",
        params: { page: 1, size: 50 },
      }),
  });

  const page = normalizePage(query.data, { page: 1, size: 50 });

  return {
    messages: page.items,
    total: page.total,
    isLoading: query.isLoading,
    error: query.error ? toApiError(query.error) : null,
  };
}

export default useGetOrderMessages;
