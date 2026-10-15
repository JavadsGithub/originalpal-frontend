import { customFetcher } from "@/lib/fetcher";
import type { Brand, BrandCreateRequest } from "@/lib/types/catalog";
import { invalidateBrandCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

/** `POST /api/brands/` — requires `brands:create`. Brands start active unless told otherwise. */
export function useCreateBrand(callbacks?: CatalogMutationCallbacks<Brand>) {
  return useResourceMutation<Brand, BrandCreateRequest>({
    mutationFn: (data) => customFetcher<Brand>({ url: "/brands/", method: "POST", data }),
    invalidate: (queryClient, brand) => invalidateBrandCaches(queryClient, brand.id),
    callbacks,
  });
}

export default useCreateBrand;
