import type { AttributeValue } from "@/lib/types/catalog";
import { useDeleteAttributeValue } from "./_attributeValueHooks";
import type { CatalogMutationCallbacks } from "./_catalogMutation";

/** `DELETE .../attribute-values/{itemId}` — requires `attribute_values:delete`. */
export function useDeleteSkuAttributeValue(callbacks?: CatalogMutationCallbacks<AttributeValue>) {
  return useDeleteAttributeValue(callbacks);
}

export default useDeleteSkuAttributeValue;
