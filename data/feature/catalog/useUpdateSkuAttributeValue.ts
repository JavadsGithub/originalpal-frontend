import type { AttributeValue } from "@/lib/types/catalog";
import { useUpdateAttributeValue } from "./_attributeValueHooks";
import type { CatalogMutationCallbacks } from "./_catalogMutation";

/** `PUT .../attribute-values/{itemId}` — requires `attribute_values:update`. */
export function useUpdateSkuAttributeValue(callbacks?: CatalogMutationCallbacks<AttributeValue>) {
  return useUpdateAttributeValue(callbacks);
}

export default useUpdateSkuAttributeValue;
