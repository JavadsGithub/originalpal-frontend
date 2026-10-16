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

/**
 * Customer-account keys.
 *
 * The profile itself lives under `authKeys.me()` (the auth provider owns that cache entry); these
 * keys cover the address book, which is the customer's only other collection.
 */
export const customerKeys = {
  all: ["customer"] as const,

  addresses: {
    all: () => [...customerKeys.all, "addresses"] as const,
    list: (params: { page: number; size: number }) =>
      [...customerKeys.addresses.all(), "list", params] as const,
    detail: (id: string) => [...customerKeys.addresses.all(), "detail", id] as const,
  },
};

/**
 * Storefront keys — the public read endpoints (`/api/catalog/products/`, `/api/homepage/`).
 *
 * Kept apart from the catalog keys on purpose: the public catalog is a different projection of the
 * same rows (published only, active SKUs only), so sharing a cache entry would show admins the wrong
 * shape.
 */
export const storefrontKeys = {
  all: ["storefront"] as const,

  homepage: () => [...storefrontKeys.all, "homepage"] as const,

  products: {
    all: () => [...storefrontKeys.all, "products"] as const,
    list: (params: {
      page: number;
      size: number;
      search?: string;
      categoryId?: string;
      brandId?: string;
    }) => [...storefrontKeys.products.all(), "list", params] as const,
    detail: (id: string) => [...storefrontKeys.products.all(), "detail", id] as const,
  },
};

/**
 * Cart keys.
 *
 * A cart is addressed by its id (the guest's capability), so every key is scoped by it — two browsers
 * on the same machine cannot see each other's cart in the cache.
 */
export const cartKeys = {
  all: ["cart"] as const,
  detail: (cartId: string | null) => [...cartKeys.all, "detail", cartId] as const,
  deliveries: (city: string) => [...cartKeys.all, "deliveries", city.trim().toLowerCase()] as const,
};

/**
 * Order keys.
 *
 * `mine` is the signed-in customer's list; `guest` is the public read that needs the order's access
 * token; `admin` is the back-office list, kept separate so a permission-gated cache entry never feeds
 * a customer screen.
 */
export const orderKeys = {
  all: ["orders"] as const,

  mine: (params: { page: number; size: number }) => [...orderKeys.all, "mine", params] as const,
  mineDetail: (orderId: string) => [...orderKeys.all, "mine", "detail", orderId] as const,

  guest: (orderId: string) => [...orderKeys.all, "guest", orderId] as const,

  payments: (orderId: string) => [...orderKeys.all, "payments", orderId] as const,

  admin: {
    all: () => [...orderKeys.all, "admin"] as const,
    list: (params: {
      page: number;
      size: number;
      status?: string;
      search?: string;
    }) => [...orderKeys.admin.all(), "list", params] as const,
    detail: (orderId: string) => [...orderKeys.admin.all(), "detail", orderId] as const,
    messages: (orderId: string) => [...orderKeys.admin.all(), "messages", orderId] as const,
  },
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
