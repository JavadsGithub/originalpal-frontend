import { customFetcher } from "@/lib/fetcher";
import type { Product, ProductCreateRequest } from "@/lib/types/catalog";
import { invalidateProductCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

/**
 * `POST /api/products/` — requires `products:create`.
 *
 * New products start as `draft` with an empty gallery, i.e. **not publishable yet**: the backend
 * wants a primary image, at least one active SKU and every required category attribute filled in.
 * `lib/catalog-rules.ts` mirrors those gates for the UI.
 */
export function useCreateProduct(callbacks?: CatalogMutationCallbacks<Product>) {
  return useResourceMutation<Product, ProductCreateRequest>({
    mutationFn: (data) => customFetcher<Product>({ url: "/products/", method: "POST", data }),
    invalidate: (queryClient, product) => invalidateProductCaches(queryClient, product.id),
    callbacks,
  });
}

export default useCreateProduct;
