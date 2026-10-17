"use client";

import { Badge } from "@/components/ui/badge";
import { formatProductPrice, stockState } from "@/lib/storefront-rules";
import type { PublicProductSummary } from "@/lib/types/storefront";
import Link from "next/link";

export interface ProductCardTranslations {
  inStock: string;
  outOfStock: string;
  imageUnavailable: string;
  noImage: string;
  fromLabel: string;
}

export interface ProductCardProps {
  product: PublicProductSummary;
  /** Rendered under the title when present (used by search results). */
  categoryName?: string | null;
  brandName?: string | null;
  translations?: Partial<ProductCardTranslations>;
}

const defaultTranslations: ProductCardTranslations = {
  inStock: "In stock",
  outOfStock: "Sold out",
  imageUnavailable: "Image needs staff access",
  noImage: "No image",
  fromLabel: "from",
};

/**
 * Tier 1 card for one public product.
 *
 * Two wires are visible in the markup: `has_stock` is the server's own answer, and the price is a
 * range as soon as the active SKUs differ. Images are deliberately a placeholder — uploaded files are
 * only readable with `uploads:download` (audit §12), so an anonymous visitor cannot load a product
 * photo at all. The card says so instead of rendering a broken image.
 */
export default function ProductCard({
  product,
  categoryName,
  brandName,
  translations = {},
}: ProductCardProps) {
  const t = { ...defaultTranslations, ...translations };
  const state = stockState(product);
  const hasMultiplePrices = product.min_price_cents !== product.max_price_cents;

  return (
    <Link
      href={`/products/${product.id}`}
      data-testid={`product-card-${product.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-background transition hover:border-foreground/40"
    >
      <div className="flex aspect-square items-center justify-center rounded-t-xl bg-muted">
        <span className="px-3 text-center text-xs text-muted-foreground">
          {product.gallery.length > 0 ? t.imageUnavailable : t.noImage}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground group-hover:underline">
            {product.title}
          </h3>
          <Badge variant={state === "in_stock" ? "success" : "outline"}>
            {state === "in_stock" ? t.inStock : t.outOfStock}
          </Badge>
        </div>

        {(categoryName || brandName) && (
          <p className="text-xs text-muted-foreground">
            {[categoryName, brandName].filter(Boolean).join(" · ")}
          </p>
        )}

        {product.summary && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{product.summary}</p>
        )}

        <p className="mt-auto pt-2 text-sm font-semibold text-foreground">
          {hasMultiplePrices && (
            <span className="pr-1 text-xs font-normal text-muted-foreground">{t.fromLabel}</span>
          )}
          {formatProductPrice(product)}
        </p>
        <p className="text-xs text-muted-foreground">
          {product.active_sku_count} {product.active_sku_count === 1 ? "variant" : "variants"}
        </p>
      </div>
    </Link>
  );
}
