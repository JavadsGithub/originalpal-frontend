import { customFetcher } from "@/lib/fetcher";
import type { CategoryAttribute, CategoryAttributeCreateRequest } from "@/lib/types/catalog";
import { invalidateAttributeCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

export interface CreateCategoryAttributeVariables {
  categoryId: string;
  data: CategoryAttributeCreateRequest;
}

/** `POST /api/categories/{id}/attributes/` — requires `category_attributes:create`. */
export function useCreateCategoryAttribute(callbacks?: CatalogMutationCallbacks<CategoryAttribute>) {
  return useResourceMutation<CategoryAttribute, CreateCategoryAttributeVariables>({
    mutationFn: ({ categoryId, data }) =>
      customFetcher<CategoryAttribute>({
        url: `/categories/${categoryId}/attributes/`,
        method: "POST",
        data,
      }),
    invalidate: (queryClient) => invalidateAttributeCaches(queryClient),
    callbacks,
  });
}

export default useCreateCategoryAttribute;
