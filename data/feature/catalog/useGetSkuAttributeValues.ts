import type { AttributeValue } from "@/lib/types/catalog";
import { useAttributeValuesQuery } from "./_attributeValueHooks";

export interface GetSkuAttributeValuesParams {
  productId: string;
  skuId: string;
  page?: number;
  size?: number;
  enabled?: boolean;
}

/** `GET /api/products/{productId}/skus/{skuId}/attribute-values/` (public). */
export function useGetSkuAttributeValues({
  productId,
  skuId,
  page,
  size,
  enabled,
}: GetSkuAttributeValuesParams) {
  const result = useAttributeValuesQuery({ productId, skuId }, { page, size, enabled });

  return { skuValues: result.values as AttributeValue[], ...result };
}

export default useGetSkuAttributeValues;
