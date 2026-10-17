import { customFetcher } from "@/lib/fetcher";
import type { Sku, SkuCreateRequest } from "@/lib/types/catalog";
import { invalidateSkuCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

export interface CreateSkuVariables {
  productId: string;
  data: SkuCreateRequest;
}

/**
 * `POST /api/products/{productId}/skus/` — requires `skus:create`.
 *
 * The backend rejects a duplicate `code` (or an identical option combination) with `409 CONFLICT`
 * and a price below 1 cent with `422 VALIDATION_ERROR` (field `price_cents`).
 */
export function useCreateSku(callbacks?: CatalogMutationCallbacks<Sku>) {
  return useResourceMutation<Sku, CreateSkuVariables>({
    mutationFn: ({ productId, data }) =>
      customFetcher<Sku>({ url: `/products/${productId}/skus/`, method: "POST", data }),
    invalidate: (queryClient, _sku, variables) => invalidateSkuCaches(queryClient, variables.productId),
    callbacks,
  });
}

export default useCreateSku;
