import { useQuery } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import { orderKeys } from "@/data/query-keys";
import type { Order } from "@/lib/types/order";

/**
 * `GET /api/orders/{order_id}?guest_access_token=…` — the public read of one order.
 *
 * The token is mandatory (`422` when missing) and wrong-or-unknown answers `404`, so an order is
 * exactly as private as its token. This is the same endpoint a guest uses after checkout and the one
 * the confirmation page keeps working with across reloads.
 */
export function useGetGuestOrder(orderId: string | null, guestToken: string | null) {
  const query = useQuery<Order>({
    queryKey: [...orderKeys.guest(orderId ?? "none"), guestToken ? "with-token" : "no-token"],
    enabled: Boolean(orderId && guestToken),
    queryFn: () =>
      customFetcher<Order>({
        url: `/orders/${orderId}`,
        method: "GET",
        params: { guest_access_token: guestToken },
      }),
  });

  return {
    order: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? toApiError(query.error) : null,
    refetch: () => void query.refetch(),
  };
}

export default useGetGuestOrder;
