import { useQuery } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import { orderKeys } from "@/data/query-keys";
import type { Order } from "@/lib/types/order";

/**
 * `GET /api/orders/{order_id}/admin` — one order, with `orders:read`.
 *
 * Worth knowing next to it: plain `GET /api/orders/{order_id}` is **not** the admin read — it needs a
 * `guest_access_token` and is the *public* one (follow-up #18). The `/admin` suffix is what makes this
 * readable by staff without the guest token.
 */
export function useGetAdminOrder(orderId: string) {
  const query = useQuery<Order>({
    queryKey: orderKeys.admin.detail(orderId),
    enabled: Boolean(orderId),
    queryFn: () => customFetcher<Order>({ url: `/orders/${orderId}/admin`, method: "GET" }),
  });

  return {
    order: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? toApiError(query.error) : null,
    refetch: () => void query.refetch(),
  };
}

export default useGetAdminOrder;
