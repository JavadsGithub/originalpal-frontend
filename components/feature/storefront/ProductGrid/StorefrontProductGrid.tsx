"use client";

import useGetPublicProducts from "@/data/feature/storefront/useGetPublicProducts";
import useGetCategories from "@/data/feature/catalog/useGetCategories";
import useGetBrands from "@/data/feature/catalog/useGetBrands";
import { useState } from "react";
import ProductGridUI from "./index";

export interface StorefrontProductGridProps {
  search?: string;
  categoryId?: string;
  brandId?: string;
  pageSize?: number;
}

/**
 * Tier 2 injector for a public product listing.
 *
 * The category and brand names come from the public `GET /api/categories/` and `GET /api/brands/`
 * reads (one request each, cached) rather than from a per-product lookup, so a page of 12 cards costs
 * four requests in total.
 */
export default function StorefrontProductGrid({
  search,
  categoryId,
  brandId,
  pageSize = 12,
}: StorefrontProductGridProps) {
  const [page, setPage] = useState(1);

  const { products, total, page: currentPage, pages, isLoading, isError, error, refetch } =
    useGetPublicProducts({ page, size: pageSize, search, categoryId, brandId });

  const { categories } = useGetCategories({ page: 1, size: 100 });
  const { brands } = useGetBrands({ page: 1, size: 100 });

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const brandNames = new Map(brands.map((brand) => [brand.id, brand.name]));

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="product-grid-loading">
        Loading products...
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-2 text-sm text-destructive" data-testid="product-grid-error">
        <p>{error?.message ?? "Failed to load products"}</p>
        <button type="button" className="underline" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <ProductGridUI
      products={products}
      total={total}
      page={currentPage}
      pages={pages}
      categoryNames={categoryNames}
      brandNames={brandNames}
      callbacks={{ onPageChange: setPage }}
    />
  );
}
