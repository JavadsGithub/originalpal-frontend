"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPriceCents } from "@/lib/types/catalog";
import {
  formatProductPrice,
  formatSkuAvailability,
  formatSkuOptions,
  stockState,
} from "@/lib/storefront-rules";
import type { PublicProductDetail } from "@/lib/types/storefront";
import AddToCartButton from "@/components/feature/cart/AddToCartButton/AddToCartButton";
import Link from "next/link";

export interface ProductDetailTranslations {
  backToList: string;
  descriptionHeading: string;
  highlightsHeading: string;
  variantsHeading: string;
  variantColumn: string;
  optionsColumn: string;
  priceColumn: string;
  availabilityColumn: string;
  addToCartColumn: string;
  stockColumn: string;
  inStock: string;
  outOfStock: string;
  noDescription: string;
  imageNotice: string;
  categoryLabel: string;
  brandLabel: string;
}

export interface ProductDetailUIProps {
  product: PublicProductDetail;
  categoryName?: string | null;
  brandName?: string | null;
  translations?: Partial<ProductDetailTranslations>;
}

const defaultTranslations: ProductDetailTranslations = {
  backToList: "All products",
  descriptionHeading: "Description",
  highlightsHeading: "Highlights",
  variantsHeading: "Variants",
  variantColumn: "SKU",
  optionsColumn: "Options",
  priceColumn: "Price",
  availabilityColumn: "Availability",
  addToCartColumn: "Buy",
  stockColumn: "Available",
  inStock: "In stock",
  outOfStock: "Sold out",
  noDescription: "The product has no description yet.",
  imageNotice:
    "Photos are not publicly served: uploaded files need the `uploads:download` permission, so this page shows the file ids instead of the images.",
  categoryLabel: "Category",
  brandLabel: "Brand",
};

/**
 * Tier 1 product detail.
 *
 * The gallery renders file **ids** on purpose (see the notice): `GET /api/files/{id}/download` is
 * permission-gated, which a shopper does not have — the fix belongs on the backend (follow-up #12).
 */
export default function ProductDetailUI({
  product,
  categoryName,
  brandName,
  translations = {},
}: ProductDetailUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const state = stockState(product);

  return (
    <article className="space-y-6" data-testid="product-detail">
      <header className="space-y-2">
        <Link href="/search" className="text-xs text-muted-foreground hover:underline">
          ← {t.backToList}
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{product.title}</h1>
          <Badge variant={state === "in_stock" ? "success" : "outline"}>
            {state === "in_stock" ? t.inStock : t.outOfStock}
          </Badge>
        </div>

        <p className="font-mono text-xs text-muted-foreground">{product.slug}</p>
        <p className="text-sm font-semibold text-foreground">{formatProductPrice(product)}</p>

        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <div className="flex gap-1">
            <dt>{t.categoryLabel}:</dt>
            <dd>
              {categoryName ? (
                <Link href={`/categories/${product.category_id}`} className="hover:underline">
                  {categoryName}
                </Link>
              ) : (
                <span className="font-mono">{product.category_id}</span>
              )}
            </dd>
          </div>
          {brandName && (
            <div className="flex gap-1">
              <dt>{t.brandLabel}:</dt>
              <dd>{brandName}</dd>
            </div>
          )}
        </dl>
      </header>

      {product.gallery.length > 0 && (
        <section className="space-y-2" data-testid="product-gallery">
          <ul className="flex flex-wrap gap-2">
            {product.gallery.map((fileId) => (
              <li
                key={fileId}
                className="flex size-20 items-center justify-center rounded border border-border bg-muted px-1 text-center font-mono text-[0.6rem] text-muted-foreground"
                title={fileId}
              >
                {fileId.slice(0, 8)}…
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t.imageNotice}</p>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {t.descriptionHeading}
        </h2>
        <p className="text-sm text-muted-foreground">
          {product.description ?? product.summary ?? t.noDescription}
        </p>
      </section>

      {product.highlights.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {t.highlightsHeading}
          </h2>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {product.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {t.variantsHeading} ({product.skus.length})
        </h2>
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.variantColumn}</TableHead>
                <TableHead>{t.optionsColumn}</TableHead>
                <TableHead>{t.priceColumn}</TableHead>
                <TableHead>{t.stockColumn}</TableHead>
                <TableHead>{t.availabilityColumn}</TableHead>
                <TableHead>{t.addToCartColumn}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.skus.map((sku) => (
                <TableRow key={sku.id} data-testid={`public-sku-${sku.code}`}>
                  <TableCell className="font-mono text-xs">{sku.code}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatSkuOptions(sku.option_values) || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{formatPriceCents(sku.price_cents)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {sku.stock_quantity}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sku.is_available ? "success" : "outline"}>
                      {formatSkuAvailability(sku)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AddToCartButton
                      skuId={sku.id}
                      available={sku.is_available}
                      availableStock={sku.stock_quantity}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          `stock_quantity` is the API&apos;s <em>available</em> count (stored minus reserved minus
          committed), and only active SKUs are listed.
        </p>
      </section>
    </article>
  );
}
