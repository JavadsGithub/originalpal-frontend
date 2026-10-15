import { customFetcher } from "@/lib/fetcher";
import type {
  AttributeDefinition,
  AttributeDefinitionUpdateRequest,
} from "@/lib/types/catalog";
import { invalidateAttributeCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

export interface UpdateAttributeDefinitionVariables {
  definitionId: string;
  data: AttributeDefinitionUpdateRequest;
}

/**
 * `PUT /api/attributes/{id}` — requires `attributes:update`.
 *
 * Changing `value_type` after values exist is accepted by the API but rewrites what the stored
 * values mean, so the form warns before doing it.
 */
export function useUpdateAttributeDefinition(callbacks?: CatalogMutationCallbacks<AttributeDefinition>) {
  return useResourceMutation<AttributeDefinition, UpdateAttributeDefinitionVariables>({
    mutationFn: ({ definitionId, data }) =>
      customFetcher<AttributeDefinition>({
        url: `/attributes/${definitionId}`,
        method: "PUT",
        data,
      }),
    invalidate: (queryClient, definition) => invalidateAttributeCaches(queryClient, definition.id),
    callbacks,
  });
}

export default useUpdateAttributeDefinition;
