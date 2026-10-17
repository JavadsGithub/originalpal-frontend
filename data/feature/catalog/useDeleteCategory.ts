import { customFetcher } from "@/lib/fetcher";
import type { Category } from "@/lib/types/catalog";
import { invalidateCategoryCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

/**
 * `DELETE /api/categories/{id}` — requires `categories:delete`.
 *
 * Refuses with `409 CONFLICT` while the category still has children or products, so the UI keeps
 * the backend's message instead of guessing.
 */
export function useDeleteCategory(callbacks?: CatalogMutationCallbacks<Category>) {
  return useResourceMutation<Category, string>({
    mutationFn: (categoryId) =>
      customFetcher<Category>({ url: `/categories/${categoryId}`, method: "DELETE" }),
    invalidate: (queryClient) => invalidateCategoryCaches(queryClient),
    callbacks,
  });
}

export default useDeleteCategory;
