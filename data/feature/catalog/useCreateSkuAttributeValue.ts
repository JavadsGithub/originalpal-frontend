import type { AttributeValue } from "@/lib/types/catalog";
import { useCreateAttributeValue } from "./_attributeValueHooks";
import type { CatalogMutationCallbacks } from "./_catalogMutation";

/**
 * `POST .../attribute-values/` — requires `attribute_values:create`.
 * Values are never `null`; the backend rejects a missing value before it inspects the type.
 */
export function useCreateSkuAttributeValue(callbacks?: CatalogMutationCallbacks<AttributeValue>) {
  return useCreateAttributeValue(callbacks);
}

export default useCreateSkuAttributeValue;
