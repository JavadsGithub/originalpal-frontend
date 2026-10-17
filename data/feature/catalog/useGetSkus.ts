import { catalogKeys } from "@/data/query-keys";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/lib/types/api";
import type { Sku } from "@/lib/types/catalog";
import { useCatalogPage } from "./_catalogQuery";

export interface GetSkusParams {
  productId: string;
  page?: number;
  size?: number;
  search?: string;
}

/**
 * `GET /api/products/{productId}/skus/` (public).
 *
 * Only **active** SKUs come back: `DELETE /skus/{id}` deactivates a SKU and it immediately stops
 * appearing here (verified live), so the SKU panel cannot offer a "reactivate" action.
 */
export function useGetSkus({
  productId,
  page = DEFAULT_PAGE,
  size = DEFAULT_PAGE_SIZE,
  search,
}: GetSkusParams) {
  const result = useCatalogPage<Sku>({
    queryKey: [...catalogKeys.products.skus(productId), { page, size, search: search || undefined }],
    url: `/products/${productId}/skus/`,
    params: { search: search || undefined },
    page,
    size,
    enabled: Boolean(productId),
  });

  return { skus: result.items, ...result };
}

export default useGetSkus;
