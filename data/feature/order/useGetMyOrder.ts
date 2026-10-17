import { useQuery } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import { orderKeys } from "@/data/query-keys";
import type { Order } from "@/lib/types/order";

/**
 * `GET /api/me/orders/{order_id}` — one of the customer's own orders.
 *
 * Anything else answers `404 RESOURCE_NOT_FOUND` (another customer's order, or one that was never
 * associated) — never `403`, so the UI cannot tell "not yours" from "does not exist".
 */
export function useGetMyOrder(orderId: string) {
  const query = useQuery<Order>({
    queryKey: orderKeys.mineDetail(orderId),
    enabled: Boolean(orderId),
    queryFn: () => customFetcher<Order>({ url: `/me/orders/${orderId}`, method: "GET" }),
  });

  return {
    order: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? toApiError(query.error) : null,
    refetch: () => void query.refetch(),
  };
}

export default useGetMyOrder;
