import { customFetcher } from "@/lib/fetcher";
import type { AttributeDefinition } from "@/lib/types/catalog";
import { invalidateAttributeCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

/** `DELETE /api/attributes/{id}` — requires `attributes:delete`. */
export function useDeleteAttributeDefinition(callbacks?: CatalogMutationCallbacks<AttributeDefinition>) {
  return useResourceMutation<AttributeDefinition, string>({
    mutationFn: (definitionId) =>
      customFetcher<AttributeDefinition>({ url: `/attributes/${definitionId}`, method: "DELETE" }),
    invalidate: (queryClient) => invalidateAttributeCaches(queryClient),
    callbacks,
  });
}

export default useDeleteAttributeDefinition;
