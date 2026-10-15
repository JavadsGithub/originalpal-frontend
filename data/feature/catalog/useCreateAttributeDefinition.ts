import { customFetcher } from "@/lib/fetcher";
import type {
  AttributeDefinition,
  AttributeDefinitionCreateRequest,
} from "@/lib/types/catalog";
import { invalidateAttributeCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

/**
 * `POST /api/attributes/` — requires `attributes:create`.
 *
 * The backend validates hard (all as `422 VALIDATION_ERROR` + `details.field`): at least one of
 * `is_specification` / `is_filterable` / `is_variant` must be true, text attributes cannot be
 * filterable, variant attributes must be single choice, units only on number attributes, choices
 * only on choice attributes and never empty. `lib/catalog-rules.ts#validateAttributeDefinition`
 * mirrors them so the form can block the request before it is sent.
 */
export function useCreateAttributeDefinition(callbacks?: CatalogMutationCallbacks<AttributeDefinition>) {
  return useResourceMutation<AttributeDefinition, AttributeDefinitionCreateRequest>({
    mutationFn: (data) =>
      customFetcher<AttributeDefinition>({ url: "/attributes/", method: "POST", data }),
    invalidate: (queryClient, definition) => invalidateAttributeCaches(queryClient, definition.id),
    callbacks,
  });
}

export default useCreateAttributeDefinition;
