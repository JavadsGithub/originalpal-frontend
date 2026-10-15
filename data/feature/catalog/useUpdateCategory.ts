import { customFetcher } from "@/lib/fetcher";
import type { Category, CategoryUpdateRequest } from "@/lib/types/catalog";
import { invalidateCategoryCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

export interface UpdateCategoryVariables {
  categoryId: string;
  data: CategoryUpdateRequest;
}

/**
 * `PUT /api/categories/{id}` — requires `categories:update`.
 *
 * `parent_id` is a three-state field: omit it to keep the current parent, send `null` to move the
 * category to the root, send an id to re-parent. Sending `null` for `name`/`slug` is a 422.
 */
export function useUpdateCategory(callbacks?: CatalogMutationCallbacks<Category>) {
  return useResourceMutation<Category, UpdateCategoryVariables>({
    mutationFn: ({ categoryId, data }) =>
      customFetcher<Category>({ url: `/categories/${categoryId}`, method: "PUT", data }),
    invalidate: (queryClient, category) => invalidateCategoryCaches(queryClient, category.id),
    callbacks,
  });
}

export default useUpdateCategory;
