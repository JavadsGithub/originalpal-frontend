"use client";

import useGetPublicProduct from "@/data/feature/storefront/useGetPublicProduct";
import useGetCategories from "@/data/feature/catalog/useGetCategories";
import useGetBrands from "@/data/feature/catalog/useGetBrands";
import Link from "next/link";
import ProductDetailUI from "./index";

export interface StorefrontProductDetailProps {
  productId: string;
}

/**
 * Tier 2 injector for the public product page.
 *
 * A `404` is a first-class state here: it is what the API answers for a draft, an archived product, or
 * a published one whose SKUs were all deactivated — all of which a shopper can reach from a stale link.
 */
export default function StorefrontProductDetail({ productId }: StorefrontProductDetailProps) {
  const { product, isLoading, isError, error, refetch } = useGetPublicProduct(productId);
  const { categories } = useGetCategories({ page: 1, size: 100 });
  const { brands } = useGetBrands({ page: 1, size: 100 });

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="product-detail-loading">
        Loading product...
      </p>
    );
  }

  if (error?.isNotFound) {
    return (
      <div
        className="space-y-2 rounded-xl border border-border p-6 text-sm"
        data-testid="product-detail-not-found"
      >
        <h1 className="text-base font-semibold text-foreground">This product is not available</h1>
        <p className="text-muted-foreground">
          The public catalog only serves published products that still have an active SKU. An archived
          product, a draft, or one whose variants were all deactivated answers `404` here.
        </p>
        <Link href="/search" className="font-semibold hover:underline">
          Browse everything else →
        </Link>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-2 text-sm text-destructive" data-testid="product-detail-error">
        <p>{error?.message ?? "Failed to load the product"}</p>
        <button type="button" className="underline" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  if (!product) return null;

  return (
    <ProductDetailUI
      product={product}
      categoryName={categories.find((category) => category.id === product.category_id)?.name ?? null}
      brandName={
        product.brand_id
          ? (brands.find((brand) => brand.id === product.brand_id)?.name ?? null)
          : null
      }
    />
  );
}
