import { customFetcher } from "@/lib/fetcher";
import type { Brand } from "@/lib/types/catalog";
import { invalidateBrandCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

/** `DELETE /api/brands/{id}` — requires `brands:delete`. */
export function useDeleteBrand(callbacks?: CatalogMutationCallbacks<Brand>) {
  return useResourceMutation<Brand, string>({
    mutationFn: (brandId) =>
      customFetcher<Brand>({ url: `/brands/${brandId}`, method: "DELETE" }),
    invalidate: (queryClient) => invalidateBrandCaches(queryClient),
    callbacks,
  });
}

export default useDeleteBrand;
