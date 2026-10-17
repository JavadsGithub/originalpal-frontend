import StorefrontProductDetail from "@/components/feature/storefront/ProductDetail/StorefrontProductDetail";

export interface StorefrontProductPageProps {
  params: Promise<{ productId: string }>;
}

/**
 * Public product detail (`GET /api/catalog/products/{id}`).
 *
 * By **id**, not slug: the public catalog has no slug-addressed endpoint, and product slugs are only
 * unique among non-archived products anyway.
 */
export default async function StorefrontProductPage({ params }: StorefrontProductPageProps) {
  const { productId } = await params;

  return <StorefrontProductDetail productId={productId} />;
}
