/**
 * Storefront presentation rules.
 *
 * Everything here is derived from what the live public endpoints return (audit §12) — the important
 * ones being that a homepage block's `target_ids` are **not validated** by the backend, and that
 * uploaded files are **not publicly readable**.
 */

import { formatPriceCents } from "./types/catalog";
import type {
  HomepageBlock,
  HomepageBlockType,
  PublicProductSummary,
  PublicSku,
} from "./types/storefront";

export const HOMEPAGE_BLOCK_TYPE_LABELS: Record<HomepageBlockType, string> = {
  banner: "Banner",
  products: "Products",
  categories: "Categories",
};

/** "€25.99" for one SKU, "€25.99 – €31.99" for a range, and a dash when nothing is buyable. */
export function formatProductPrice(product: Pick<PublicProductSummary, "min_price_cents" | "max_price_cents">): string {
  if (product.min_price_cents === product.max_price_cents) {
    return formatPriceCents(product.min_price_cents);
  }

  return `${formatPriceCents(product.min_price_cents)} – ${formatPriceCents(product.max_price_cents)}`;
}

export type StockState = "in_stock" | "out_of_stock";

/**
 * `has_stock` is the server's own `any(sku.is_available)`, and a public product always has at least
 * one active SKU — so there are only two states to render, not three.
 */
export function stockState(product: Pick<PublicProductSummary, "has_stock">): StockState {
  return product.has_stock ? "in_stock" : "out_of_stock";
}

/** One line summarising a SKU's options: `{size: "M", color: "red"}` → `size: M · color: red`. */
export function formatSkuOptions(optionValues: Record<string, string>): string {
  const entries = Object.entries(optionValues);
  if (entries.length === 0) return "";
  return entries.map(([key, value]) => `${key}: ${value}`).join(" · ");
}

/** A SKU's available units, phrased for a shopper rather than a stock clerk. */
export function formatSkuAvailability(sku: Pick<PublicSku, "is_available" | "stock_quantity">): string {
  if (!sku.is_available) return "Sold out";
  if (sku.stock_quantity <= 3) return `Only ${sku.stock_quantity} left`;
  return "In stock";
}

/**
 * Resolves a block's `target_ids` against what the storefront actually has.
 *
 * The API stores the ids without checking them (`POST /homepage/blocks/` accepts an unknown product),
 * so a block can legitimately point at a product that was archived afterwards. `missing` lets the UI
 * say so instead of rendering a broken card or silently dropping the block.
 */
export function resolveBlockTargets<T extends { id: string }>(
  block: Pick<HomepageBlock, "target_ids">,
  candidates: T[],
): { resolved: T[]; missing: string[] } {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const resolved: T[] = [];
  const missing: string[] = [];

  for (const id of block.target_ids) {
    const candidate = byId.get(id);
    if (candidate) resolved.push(candidate);
    else missing.push(id);
  }

  return { resolved, missing };
}

/**
 * Where a `custom` block link should go.
 *
 * Blocks carry a free-form `target_url`, and the backend's own navigation mixes storefront paths
 * (`/categories`, `/search`, `/cart`, `/account`) with one that has no API counterpart (`/blog`).
 */
export function isInternalHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//");
}

/**
 * Whether a banner's `image_url` can be rendered by a shopper's browser.
 *
 * `true` for external `http(s)` URLs; `false` for the API's own file endpoint, because
 * `GET /api/files/{id}/download` needs `uploads:download` (verified: anonymous → 401). A banner that
 * points at an uploaded file therefore cannot render, and saying so beats a broken image.
 */
export function isPubliclyRenderableImage(url: string | null | undefined): boolean {
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const parsed = new URL(url);
    return !parsed.pathname.startsWith("/api/files/");
  } catch {
    return false;
  }
}

/** A short label for the block's call to action, when it has one. */
export function blockCtaLabel(block: Pick<HomepageBlock, "block_type" | "target_url">): string | null {
  if (!block.target_url) return null;
  return block.block_type === "banner" ? "Shop now" : "View all";
}
