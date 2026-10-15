import { customFetcher } from "@/lib/fetcher";
import type { Product } from "@/lib/types/catalog";
import { invalidateProductCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

export interface PublishProductVariables {
  productId: string;
}

/**
 * `POST /api/products/{id}/publish` — requires `products:publish`.
 *
 * Prepares for three possible `422 VALIDATION_ERROR`s (`details.field` = `gallery`, `skus`, or
 * `attribute_values`); see `lib/catalog-rules.ts` for the same rules expressed as a UI checklist.
 */
export function usePublishProduct(callbacks?: CatalogMutationCallbacks<Product>) {
  return useResourceMutation<Product, PublishProductVariables>({
    mutationFn: ({ productId }) =>
      customFetcher<Product>({ url: `/products/${productId}/publish`, method: "POST" }),
    invalidate: (queryClient, product) => invalidateProductCaches(queryClient, product.id),
    callbacks,
  });
}

export default usePublishProduct;
