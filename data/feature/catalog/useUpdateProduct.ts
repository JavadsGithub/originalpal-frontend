import { customFetcher } from "@/lib/fetcher";
import type { Product, ProductUpdateRequest } from "@/lib/types/catalog";
import { invalidateProductCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

export interface UpdateProductVariables {
  productId: string;
  data: ProductUpdateRequest;
}

/**
 * `PUT /api/products/{id}` — requires `products:update`.
 *
 * Partial by design: send only what changed (the form diffs for that reason). `brand_id: null`
 * clears the brand; `title`/`slug`/`category_id`/`highlights`/`gallery` cannot be nulled.
 */
export function useUpdateProduct(callbacks?: CatalogMutationCallbacks<Product>) {
  return useResourceMutation<Product, UpdateProductVariables>({
    mutationFn: ({ productId, data }) =>
      customFetcher<Product>({ url: `/products/${productId}`, method: "PUT", data }),
    invalidate: (queryClient, product) => invalidateProductCaches(queryClient, product.id),
    callbacks,
  });
}

export default useUpdateProduct;
