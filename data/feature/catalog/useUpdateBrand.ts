import { customFetcher } from "@/lib/fetcher";
import type { Brand, BrandUpdateRequest } from "@/lib/types/catalog";
import { invalidateBrandCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

export interface UpdateBrandVariables {
  brandId: string;
  data: BrandUpdateRequest;
}

/**
 * `PUT /api/brands/{id}` — requires `brands:update`.
 *
 * Deactivating a brand is allowed at any time, but the backend then refuses to attach it to a
 * product (`422 VALIDATION_ERROR`, field `brand_id`), which the products screen surfaces inline.
 */
export function useUpdateBrand(callbacks?: CatalogMutationCallbacks<Brand>) {
  return useResourceMutation<Brand, UpdateBrandVariables>({
    mutationFn: ({ brandId, data }) =>
      customFetcher<Brand>({ url: `/brands/${brandId}`, method: "PUT", data }),
    invalidate: (queryClient, brand) => invalidateBrandCaches(queryClient, brand.id),
    callbacks,
  });
}

export default useUpdateBrand;
