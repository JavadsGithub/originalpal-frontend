import { useQuery } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import { catalogKeys } from "@/data/query-keys";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, normalizePage } from "@/lib/types/api";
import type {
  AttributeValue,
  AttributeValueCreateRequest,
  AttributeValueUpdateRequest,
} from "@/lib/types/catalog";
import { invalidateAttributeValueCaches } from "./_catalogInvalidation";
import { useResourceMutation, type CatalogMutationCallbacks } from "./_catalogMutation";

/**
 * Attribute values exist in two scopes with identical semantics:
 *
 *   product → `/products/{productId}/attribute-values/`
 *   sku     → `/products/{productId}/skus/{skuId}/attribute-values/`
 *
 * The two internal factories below keep that difference in one place; the public hooks in
 * `use{Get,Create,Update,Delete}{Product,Sku}AttributeValue*.ts` are thin, per-file wrappers.
 */

export interface AttributeValueScope {
  productId: string;
  skuId?: string;
}

function scopePath({ productId, skuId }: AttributeValueScope, suffix = ""): string {
  const base = skuId
    ? `/products/${productId}/skus/${skuId}/attribute-values/`
    : `/products/${productId}/attribute-values/`;
  return suffix ? `${base}${suffix}` : base;
}

export function useAttributeValuesQuery(
  scope: AttributeValueScope,
  { page = DEFAULT_PAGE, size = DEFAULT_PAGE_SIZE, enabled = true } = {},
) {
  const queryKey = scope.skuId
    ? catalogKeys.products.skuAttributeValues(scope.productId, scope.skuId)
    : catalogKeys.products.attributeValues(scope.productId);

  const query = useQuery({
    queryKey: [...queryKey, { page, size }],
    enabled: enabled && Boolean(scope.productId),
    queryFn: () =>
      customFetcher<{ items: AttributeValue[]; total: number; page: number; size: number; pages: number | null }>({
        url: scopePath(scope),
        method: "GET",
        params: { page, size },
      }),
  });

  const pageData = normalizePage(query.data, { page, size });

  return {
    values: pageData.items,
    total: pageData.total,
    page: pageData.page,
    size: pageData.size,
    pages: pageData.pages ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? toApiError(query.error) : null,
    refetch: () => void query.refetch(),
  };
}

export function useCreateAttributeValue(callbacks?: CatalogMutationCallbacks<AttributeValue>) {
  return useResourceMutation<
    AttributeValue,
    { scope: AttributeValueScope; data: AttributeValueCreateRequest }
  >({
    mutationFn: ({ scope, data }) =>
      customFetcher<AttributeValue>({ url: scopePath(scope), method: "POST", data }),
    invalidate: (queryClient, _value, { scope }) =>
      invalidateAttributeValueCaches(queryClient, scope.productId, scope.skuId),
    callbacks,
  });
}

export function useUpdateAttributeValue(callbacks?: CatalogMutationCallbacks<AttributeValue>) {
  return useResourceMutation<
    AttributeValue,
    { scope: AttributeValueScope; itemId: string; data: AttributeValueUpdateRequest }
  >({
    mutationFn: ({ scope, itemId, data }) =>
      customFetcher<AttributeValue>({ url: scopePath(scope, itemId), method: "PUT", data }),
    invalidate: (queryClient, _value, { scope }) =>
      invalidateAttributeValueCaches(queryClient, scope.productId, scope.skuId),
    callbacks,
  });
}

export function useDeleteAttributeValue(callbacks?: CatalogMutationCallbacks<AttributeValue>) {
  return useResourceMutation<AttributeValue, { scope: AttributeValueScope; itemId: string }>({
    mutationFn: ({ scope, itemId }) =>
      customFetcher<AttributeValue>({ url: scopePath(scope, itemId), method: "DELETE" }),
    invalidate: (queryClient, _value, { scope }) =>
      invalidateAttributeValueCaches(queryClient, scope.productId, scope.skuId),
    callbacks,
  });
}

export type { ApiError };
