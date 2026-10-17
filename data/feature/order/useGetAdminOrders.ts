import { orderKeys } from "@/data/query-keys";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/lib/types/api";
import type { Order } from "@/lib/types/order";
import { usePagedQuery } from "@/data/feature/_pagedQuery";

/**
 * `GET /api/orders/` — the back-office order list. Requires `orders:read` (a zero-permission customer
 * token answers `403 FORBIDDEN`).
 *
 * Both filters are the endpoint's own: `status` is one of the six enum values — anything else is a
 * FastAPI `422` on the enum, which is why the UI only offers the six — and `search` is applied by the
 * backend across the order's contact fields.
 */
export function useGetAdminOrders({
  page = DEFAULT_PAGE,
  size = DEFAULT_PAGE_SIZE,
  status,
  search,
}: {
  page?: number;
  size?: number;
  status?: string;
  search?: string;
} = {}) {
  const term = search?.trim() || undefined;

  const result = usePagedQuery<Order>({
    queryKey: orderKeys.admin.list({ page, size, status, search: term }),
    url: "/orders/",
    params: { status: status || undefined, search: term },
    page,
    size,
  });

  return { orders: result.items, ...result };
}

export default useGetAdminOrders;
