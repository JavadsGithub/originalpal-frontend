import type { QueryClient } from "@tanstack/react-query";
import { catalogKeys } from "@/data/query-keys";

/**
 * Catalog cache invalidation, kept in one place because the entities are entangled: a category
 * rename changes category lists *and* every product row that shows a category name; a SKU write
 * changes the product detail, its SKU list and its stock history.
 */

export function invalidateCategoryCaches(queryClient: QueryClient, categoryId?: string): void {
  queryClient.invalidateQueries({ queryKey: catalogKeys.categories.all() });
  queryClient.invalidateQueries({ queryKey: catalogKeys.attributes.all() });
  // Products render category names and are filtered by category.
  queryClient.invalidateQueries({ queryKey: catalogKeys.products.all() });
  if (categoryId) {
    queryClient.invalidateQueries({ queryKey: catalogKeys.categories.detail(categoryId) });
  }
}

export function invalidateBrandCaches(queryClient: QueryClient, brandId?: string): void {
  queryClient.invalidateQueries({ queryKey: catalogKeys.brands.all() });
  queryClient.invalidateQueries({ queryKey: catalogKeys.products.all() });
  if (brandId) {
    queryClient.invalidateQueries({ queryKey: catalogKeys.brands.detail(brandId) });
  }
}

export function invalidateAttributeCaches(queryClient: QueryClient, definitionId?: string): void {
  queryClient.invalidateQueries({ queryKey: catalogKeys.attributes.all() });
  if (definitionId) {
    queryClient.invalidateQueries({ queryKey: catalogKeys.attributes.detail(definitionId) });
  }
  // Required-attribute state feeds the publish checklist.
  queryClient.invalidateQueries({ queryKey: catalogKeys.products.all() });
}

export function invalidateProductCaches(queryClient: QueryClient, productId?: string): void {
  queryClient.invalidateQueries({ queryKey: catalogKeys.products.all() });
  if (productId) {
    queryClient.invalidateQueries({ queryKey: catalogKeys.products.detail(productId) });
  }
}

export function invalidateSkuCaches(queryClient: QueryClient, productId: string): void {
  queryClient.invalidateQueries({ queryKey: catalogKeys.products.skus(productId) });
  queryClient.invalidateQueries({ queryKey: catalogKeys.products.detail(productId) });
  queryClient.invalidateQueries({ queryKey: catalogKeys.products.all() });
}

export function invalidateAttributeValueCaches(
  queryClient: QueryClient,
  productId: string,
  skuId?: string,
): void {
  queryClient.invalidateQueries({ queryKey: catalogKeys.products.attributeValues(productId) });
  if (skuId) {
    queryClient.invalidateQueries({
      queryKey: catalogKeys.products.skuAttributeValues(productId, skuId),
    });
  }
  queryClient.invalidateQueries({ queryKey: catalogKeys.products.detail(productId) });
}

export function invalidateFileCaches(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: catalogKeys.files.all() });
}
