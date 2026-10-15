import { catalogKeys } from "@/data/query-keys";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/lib/types/api";
import type { SkuStockAdjustment } from "@/lib/types/catalog";
import { useCatalogPage } from "./_catalogQuery";

export interface GetSkuStockAdjustmentsParams {
  productId: string;
  skuId: string;
  page?: number;
  size?: number;
  enabled?: boolean;
}

/** `GET .../skus/{skuId}/stock-adjustments` — requires `skus:update` (history is not public). */
export function useGetSkuStockAdjustments({
  productId,
  skuId,
  page = DEFAULT_PAGE,
  size = DEFAULT_PAGE_SIZE,
  enabled = true,
}: GetSkuStockAdjustmentsParams) {
  const result = useCatalogPage<SkuStockAdjustment>({
    queryKey: catalogKeys.products.stockAdjustments(productId, skuId),
    url: `/products/${productId}/skus/${skuId}/stock-adjustments`,
    page,
    size,
    enabled: enabled && Boolean(productId) && Boolean(skuId),
  });

  return { adjustments: result.items, ...result };
}

export default useGetSkuStockAdjustments;
