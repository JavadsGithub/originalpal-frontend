/**
 * Central React Query key registry.
 *
 * One place to look when invalidating after a mutation, so hooks never guess each other's keys.
 */
export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
  permissions: () => [...authKeys.all, "permissions"] as const,
};

export const userKeys = {
  all: ["users"] as const,
  list: (params: { page: number; size: number }) =>
    [...userKeys.all, "list", params] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
};

export const roleKeys = {
  all: ["roles"] as const,
  list: (params: { page: number; size: number }) =>
    [...roleKeys.all, "list", params] as const,
  detail: (id: string) => [...roleKeys.all, "detail", id] as const,
};

export const systemKeys = {
  all: ["system"] as const,
  backendHealth: () => [...systemKeys.all, "backend-health"] as const,
};

/**
 * Catalog keys. Collection keys embed the filter object, so two screens asking for different
 * filters (e.g. `status=draft` vs `status=published`) never share a cache entry.
 */
export const catalogKeys = {
  all: ["catalog"] as const,

  categories: {
    all: () => [...catalogKeys.all, "categories"] as const,
    list: (params: { page: number; size: number; parentId?: string | null }) =>
      [...catalogKeys.categories.all(), "list", params] as const,
    detail: (id: string) => [...catalogKeys.categories.all(), "detail", id] as const,
  },

  brands: {
    all: () => [...catalogKeys.all, "brands"] as const,
    list: (params: { page: number; size: number }) =>
      [...catalogKeys.brands.all(), "list", params] as const,
    detail: (id: string) => [...catalogKeys.brands.all(), "detail", id] as const,
  },

  attributes: {
    all: () => [...catalogKeys.all, "attributes"] as const,
    list: (params: { page: number; size: number }) =>
      [...catalogKeys.attributes.all(), "list", params] as const,
    detail: (id: string) => [...catalogKeys.attributes.all(), "detail", id] as const,
    /** `GET /categories/{categoryId}/attributes/` — links, not definitions. */
    forCategory: (categoryId: string) =>
      [...catalogKeys.attributes.all(), "category", categoryId] as const,
  },

  products: {
    all: () => [...catalogKeys.all, "products"] as const,
    list: (params: {
      page: number;
      size: number;
      status?: string;
      categoryId?: string;
      brandId?: string;
      search?: string;
    }) => [...catalogKeys.products.all(), "list", params] as const,
    detail: (productId: string) => [...catalogKeys.products.all(), "detail", productId] as const,
    skus: (productId: string) => [...catalogKeys.products.detail(productId), "skus"] as const,
    stockAdjustments: (productId: string, skuId: string) =>
      [...catalogKeys.products.skus(productId), skuId, "stock-adjustments"] as const,
    attributeValues: (productId: string) =>
      [...catalogKeys.products.detail(productId), "attribute-values"] as const,
    skuAttributeValues: (productId: string, skuId: string) =>
      [...catalogKeys.products.skus(productId), skuId, "attribute-values"] as const,
  },

  files: {
    all: () => [...catalogKeys.all, "files"] as const,
    list: (params: { page: number; size: number }) =>
      [...catalogKeys.files.all(), "list", params] as const,
  },
};
