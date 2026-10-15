import { customFetcher } from "@/lib/fetcher";
import type { Sku } from "@/lib/types/catalog";
import { invalidateSkuCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

export interface DeactivateSkuVariables {
  productId: string;
  skuId: string;
}

/**
 * `DELETE /api/products/{productId}/skus/{skuId}` — requires `skus:delete`.
 *
 * It deactivates rather than deletes (`is_active: false` in the response) and the SKU stops
 * appearing in the SKU list. Because publication requires ≥1 *active* SKU, deactivating the last
 * one silently un-publishes the product's eligibility — `lib/catalog-rules.ts` warns about it.
 */
export function useDeactivateSku(callbacks?: CatalogMutationCallbacks<Sku>) {
  return useResourceMutation<Sku, DeactivateSkuVariables>({
    mutationFn: ({ productId, skuId }) =>
      customFetcher<Sku>({
        url: `/products/${productId}/skus/${skuId}`,
        method: "DELETE",
      }),
    invalidate: (queryClient, _sku, variables) => invalidateSkuCaches(queryClient, variables.productId),
    callbacks,
  });
}

export default useDeactivateSku;
