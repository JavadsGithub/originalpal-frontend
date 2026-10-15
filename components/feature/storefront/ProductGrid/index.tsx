"use client";

import ProductCard from "@/components/feature/storefront/ProductCard/index";
import { Button } from "@/components/ui/button";
import type { PublicProductSummary } from "@/lib/types/storefront";

export interface ProductGridTranslations {
  emptyState: string;
  loadingState: string;
  totalLabel: string;
  previousButtonText: string;
  nextButtonText: string;
  pageLabel: string;
}

export interface ProductGridCallbacks {
  onPageChange: (page: number) => void;
}

export interface ProductGridUIProps {
  products: PublicProductSummary[];
  total: number;
  page: number;
  pages: number;
  categoryNames?: Map<string, string>;
  brandNames?: Map<string, string>;
  translations?: Partial<ProductGridTranslations>;
  callbacks: ProductGridCallbacks;
}

const defaultTranslations: ProductGridTranslations = {
  emptyState: "No products match this view yet.",
  loadingState: "Loading products...",
  totalLabel: "products",
  previousButtonText: "Previous",
  nextButtonText: "Next",
  pageLabel: "Page",
};

/** Tier 1 grid of public products with the backend's own pagination payload. */
export default function ProductGridUI({
  products,
  total,
  page,
  pages,
  categoryNames,
  brandNames,
  translations = {},
  callbacks,
}: ProductGridUIProps) {
  const t = { ...defaultTranslations, ...translations };

  return (
    <section className="space-y-4" data-testid="product-grid">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground" data-testid="product-grid-total">
          {total} {t.totalLabel}
        </span>
        {pages > 1 && (
          <span className="text-xs text-muted-foreground">
            {t.pageLabel} {page} / {pages}
          </span>
        )}
      </div>

      {products.length === 0 ? (
        <p
          className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground"
          data-testid="product-grid-empty"
        >
          {t.emptyState}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              categoryName={categoryNames?.get(product.category_id) ?? null}
              brandName={
                product.brand_id ? (brandNames?.get(product.brand_id) ?? null) : null
              }
            />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => callbacks.onPageChange(page - 1)}
          >
            {t.previousButtonText}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => callbacks.onPageChange(page + 1)}
          >
            {t.nextButtonText}
          </Button>
        </div>
      )}
    </section>
  );
}
