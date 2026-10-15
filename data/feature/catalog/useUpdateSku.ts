import { customFetcher } from "@/lib/fetcher";
import type { Sku, SkuUpdateRequest } from "@/lib/types/catalog";
import { invalidateSkuCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

export interface UpdateSkuVariables {
  productId: string;
  skuId: string;
  data: SkuUpdateRequest;
}

/**
 * `PUT /api/products/{productId}/skus/{skuId}` — requires `skus:update`.
 *
 * Partial: untouched fields keep their value (verified live — changing the price left the stock
 * alone). Stock moves are deliberately *not* part of this payload; they go through
 * `useAdjustSkuStock` so every change lands in the adjustment history with a reason.
 */
export function useUpdateSku(callbacks?: CatalogMutationCallbacks<Sku>) {
  return useResourceMutation<Sku, UpdateSkuVariables>({
    mutationFn: ({ productId, skuId, data }) =>
      customFetcher<Sku>({ url: `/products/${productId}/skus/${skuId}`, method: "PUT", data }),
    invalidate: (queryClient, _sku, variables) => invalidateSkuCaches(queryClient, variables.productId),
    callbacks,
  });
}

export default useUpdateSku;
