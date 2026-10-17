import { customFetcher } from "@/lib/fetcher";
import type { Product } from "@/lib/types/catalog";
import { invalidateProductCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

/**
 * `DELETE /api/products/{id}` — requires `products:delete`.
 *
 * Despite the response payload saying `status: "archived"`, this is **not** an "archived" state you
 * can browse later: the product disappears from every listing and `GET /api/products/{id}` answers
 * 404 (verified live). The UI therefore treats it as "remove from the catalog" and asks for
 * confirmation before calling it.
 */
export function useArchiveProduct(callbacks?: CatalogMutationCallbacks<Product>) {
  return useResourceMutation<Product, string>({
    mutationFn: (productId) =>
      customFetcher<Product>({ url: `/products/${productId}`, method: "DELETE" }),
    invalidate: (queryClient) => invalidateProductCaches(queryClient),
    callbacks,
  });
}

export default useArchiveProduct;
