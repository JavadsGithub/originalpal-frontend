import { customFetcher } from "@/lib/fetcher";
import type { CategoryAttribute, CategoryAttributeUpdateRequest } from "@/lib/types/catalog";
import { invalidateAttributeCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

export interface UpdateCategoryAttributeVariables {
  categoryId: string;
  itemId: string;
  data: CategoryAttributeUpdateRequest;
}

/**
 * `PUT /api/categories/{categoryId}/attributes/{itemId}` — requires `category_attributes:update`.
 * `display_order` cannot be nulled; the other three fields can be omitted to keep their value.
 */
export function useUpdateCategoryAttribute(callbacks?: CatalogMutationCallbacks<CategoryAttribute>) {
  return useResourceMutation<CategoryAttribute, UpdateCategoryAttributeVariables>({
    mutationFn: ({ categoryId, itemId, data }) =>
      customFetcher<CategoryAttribute>({
        url: `/categories/${categoryId}/attributes/${itemId}`,
        method: "PUT",
        data,
      }),
    invalidate: (queryClient) => invalidateAttributeCaches(queryClient),
    callbacks,
  });
}

export default useUpdateCategoryAttribute;
