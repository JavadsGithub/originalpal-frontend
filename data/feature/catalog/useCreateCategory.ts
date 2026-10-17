import { customFetcher } from "@/lib/fetcher";
import type { Category, CategoryCreateRequest } from "@/lib/types/catalog";
import { invalidateCategoryCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

/** `POST /api/categories/` — requires `categories:create`. Duplicate slug/parent → 409 CONFLICT. */
export function useCreateCategory(callbacks?: CatalogMutationCallbacks<Category>) {
  return useResourceMutation<Category, CategoryCreateRequest>({
    mutationFn: (data) => customFetcher<Category>({ url: "/categories/", method: "POST", data }),
    invalidate: (queryClient, category) => invalidateCategoryCaches(queryClient, category.id),
    callbacks,
  });
}

export default useCreateCategory;
