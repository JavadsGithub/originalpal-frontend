import { customFetcher } from "@/lib/fetcher";
import { catalogKeys } from "@/data/query-keys";
import type { SkuStockAdjustmentResult, SkuStockAdjustRequest } from "@/lib/types/catalog";
import { invalidateSkuCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

export interface AdjustSkuStockVariables {
  productId: string;
  skuId: string;
  data: SkuStockAdjustRequest;
}

/**
 * `POST /api/products/{productId}/skus/{skuId}/stock-adjustments` — requires `skus:update`.
 *
 * Live-verified rules: `quantity_delta` must be a non-zero integer (else FastAPI 422), `reason`
 * must be non-blank, and the resulting stock cannot go negative — overselling answers
 * `422 VALIDATION_ERROR` with field `stock_quantity_after`. The response carries both the updated
 * SKU and the recorded adjustment, and the history endpoint returns the same entries paged.
 */
export function useAdjustSkuStock(callbacks?: CatalogMutationCallbacks<SkuStockAdjustmentResult>) {
  return useResourceMutation<SkuStockAdjustmentResult, AdjustSkuStockVariables>({
    mutationFn: ({ productId, skuId, data }) =>
      customFetcher<SkuStockAdjustmentResult>({
        url: `/products/${productId}/skus/${skuId}/stock-adjustments`,
        method: "POST",
        data,
      }),
    invalidate: (queryClient, _result, variables) => {
      invalidateSkuCaches(queryClient, variables.productId);
      queryClient.invalidateQueries({
        queryKey: catalogKeys.products.stockAdjustments(variables.productId, variables.skuId),
      });
    },
    callbacks,
  });
}

export default useAdjustSkuStock;
