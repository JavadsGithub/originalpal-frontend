import { customFetcher } from "@/lib/fetcher";
import type { Product } from "@/lib/types/catalog";
import { invalidateProductCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

/** `POST /api/products/{id}/unpublish` — requires `products:unpublish`. Moves published → draft. */
export function useUnpublishProduct(callbacks?: CatalogMutationCallbacks<Product>) {
  return useResourceMutation<Product, { productId: string }>({
    mutationFn: ({ productId }) =>
      customFetcher<Product>({ url: `/products/${productId}/unpublish`, method: "POST" }),
    invalidate: (queryClient, product) => invalidateProductCaches(queryClient, product.id),
    callbacks,
  });
}

export default useUnpublishProduct;
