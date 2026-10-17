/**
 * Storefront wire types — field-for-field copies of the backend's
 * `app/interface/dto/{public_catalog,homepage}_dto.py`, confirmed against live responses
 * (`docs/integration/contract-audit.md` §12).
 *
 * These are the **public** projections: no auth, no permission, and deliberately less than the admin
 * DTOs. A summary has no `description` and no SKUs; the detail adds both.
 */

export type { PaginatedPayload, PageParams } from "./api";

/** `PublicSku` — one purchasable variant on the product detail. */
export interface PublicSku {
  id: string;
  code: string;
  option_values: Record<string, string>;
  price_cents: number;
  /**
   * **Available** units, not the stored quantity: the backend sends
   * `stock_quantity - reserved_quantity - committed_quantity`. Zero means "cannot buy right now".
   */
  stock_quantity: number;
  image_gallery: string[];
  /** `stock_quantity > 0` — computed server-side, so the client never has to guess. */
  is_available: boolean;
}

/** `PublicProductSummary` — a card in `GET /api/catalog/products/`. */
export interface PublicProductSummary {
  id: string;
  title: string;
  slug: string;
  category_id: string;
  brand_id: string | null;
  summary: string | null;
  highlights: string[];
  gallery: string[];
  /** Cheapest / dearest **active** SKU. Only defined while the product has an active SKU. */
  min_price_cents: number;
  max_price_cents: number;
  has_stock: boolean;
  active_sku_count: number;
}

/**
 * `PublicProductDetail` — `GET /api/catalog/products/{id}`.
 *
 * `skus` only contains **active** SKUs, and a product whose SKUs are all deactivated disappears from
 * the public catalog completely (the query requires one active SKU), so `skus` is never empty here.
 */
export interface PublicProductDetail extends PublicProductSummary {
  description: string | null;
  skus: PublicSku[];
}

/** The block types the backend accepts (`_HOMEPAGE_BLOCK_TYPES`). */
export const HOMEPAGE_BLOCK_TYPES = ["banner", "products", "categories"] as const;
export type HomepageBlockType = (typeof HOMEPAGE_BLOCK_TYPES)[number];

/** `HomepageBlock` — one editor-managed block of the homepage. */
export interface HomepageBlock {
  id: string;
  /** One of `HOMEPAGE_BLOCK_TYPES`; the API rejects anything else with `422 field=block_type`. */
  block_type: string;
  title: string;
  subtitle: string | null;
  /** Free-form URL. Uploaded files are **not** publicly readable, so a file id will not render. */
  image_url: string | null;
  target_url: string | null;
  /**
   * Ids the block points at, interpreted by `block_type` (products / categories). The API does not
   * validate them, so they can dangle — see `resolveBlockTargets`.
   */
  target_ids: string[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** `HomepageNavigationItem` — the fixed five-entry menu the backend returns. */
export interface HomepageNavigationItem {
  label: string;
  href: string;
}

/** `PublicHomepage` — `GET /api/homepage/`: active blocks only, plus navigation. */
export interface PublicHomepage {
  blocks: HomepageBlock[];
  navigation: HomepageNavigationItem[];
}

/** Query parameters of `GET /api/catalog/products/`. */
export interface PublicProductFilters {
  search?: string;
  categoryId?: string;
  brandId?: string;
  page?: number;
  size?: number;
}

/** The homepage block shape as the admin screen edits it (`HomepageBlockCreate`). */
export interface HomepageBlockCreateRequest {
  block_type: HomepageBlockType;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  target_url?: string | null;
  target_ids?: string[];
  display_order?: number;
  is_active?: boolean;
}

/** `HomepageBlockUpdate` — omitted fields are preserved; nullable fields may be cleared with `null`. */
export type HomepageBlockUpdateRequest = Partial<HomepageBlockCreateRequest>;
