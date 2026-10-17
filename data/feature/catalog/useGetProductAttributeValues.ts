import type { AttributeValue } from "@/lib/types/catalog";
import { useAttributeValuesQuery } from "./_attributeValueHooks";

export interface GetProductAttributeValuesParams {
  productId: string;
  page?: number;
  size?: number;
  enabled?: boolean;
}

/**
 * `GET /api/products/{productId}/attribute-values/` (public).
 *
 * Product-level values only (`sku_id` is null); they are what a `product`-level or
 * `product_or_sku`-level required attribute is satisfied by.
 */
export function useGetProductAttributeValues({
  productId,
  page,
  size,
  enabled,
}: GetProductAttributeValuesParams) {
  const result = useAttributeValuesQuery({ productId }, { page, size, enabled });

  return { ...result, values: result.values as AttributeValue[] };
}

export default useGetProductAttributeValues;
