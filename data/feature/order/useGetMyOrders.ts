import { orderKeys } from "@/data/query-keys";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/lib/types/api";
import type { Order } from "@/lib/types/order";
import { usePagedQuery } from "@/data/feature/_pagedQuery";

/**
 * `GET /api/me/orders/` — the signed-in customer's orders.
 *
 * This is **not** "orders placed while signed in": checkout never attaches an order to an account
 * (verified live — `customer_id` stays `null`), so the list only shows orders that were associated
 * afterwards through `POST /api/me/orders/guest-associations/…`. A fresh customer sees zero orders
 * until they claim them, which is exactly what the empty state has to explain.
 */
export function useGetMyOrders({ page = DEFAULT_PAGE, size = DEFAULT_PAGE_SIZE }: { page?: number; size?: number } = {}) {
  const result = usePagedQuery<Order>({
    queryKey: orderKeys.mine({ page, size }),
    url: "/me/orders/",
    page,
    size,
  });

  return { orders: result.items, ...result };
}

export default useGetMyOrders;
