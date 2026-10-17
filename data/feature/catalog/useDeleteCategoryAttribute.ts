import { customFetcher } from "@/lib/fetcher";
import type { CategoryAttribute } from "@/lib/types/catalog";
import { invalidateAttributeCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

export interface DeleteCategoryAttributeVariables {
  categoryId: string;
  itemId: string;
}

/** `DELETE /api/categories/{categoryId}/attributes/{itemId}` — requires `category_attributes:delete`. */
export function useDeleteCategoryAttribute(callbacks?: CatalogMutationCallbacks<CategoryAttribute>) {
  return useResourceMutation<CategoryAttribute, DeleteCategoryAttributeVariables>({
    mutationFn: ({ categoryId, itemId }) =>
      customFetcher<CategoryAttribute>({
        url: `/categories/${categoryId}/attributes/${itemId}`,
        method: "DELETE",
      }),
    invalidate: (queryClient) => invalidateAttributeCaches(queryClient),
    callbacks,
  });
}

export default useDeleteCategoryAttribute;
