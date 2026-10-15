import { customerKeys } from "@/data/query-keys";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/lib/types/api";
import type { CustomerAddress } from "@/lib/types/customer";
import { usePagedQuery } from "@/data/feature/_pagedQuery";

export interface GetAddressesParams {
  page?: number;
  size?: number;
  enabled?: boolean;
}

/**
 * `GET /api/me/addresses/` — the signed-in customer's own addresses, newest pagination payload
 * (`{items,total,page,size,pages}`). No permission is involved; the endpoint is scoped by the token,
 * and `size` above 100 is a FastAPI 422 (`size` is bounded by `fastapi_pagination`).
 */
export function useGetAddresses({
  page = DEFAULT_PAGE,
  size = DEFAULT_PAGE_SIZE,
  enabled = true,
}: GetAddressesParams = {}) {
  const result = usePagedQuery<CustomerAddress>({
    queryKey: customerKeys.addresses.list({ page, size }),
    url: "/me/addresses/",
    page,
    size,
    enabled,
  });

  return { addresses: result.items, ...result };
}

export default useGetAddresses;
