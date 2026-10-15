import Link from "next/link";

export interface ProductDetailNotFoundProps {
  productId: string;
}

/**
 * Shown for `404 RESOURCE_NOT_FOUND` — in practice this is an **archived** product: deleting one
 * removes it from every listing *and* from `GET /api/products/{id}` (verified live), rather than
 * parking it in an "archived" tab.
 */
export default function ProductDetailNotFound({ productId }: ProductDetailNotFoundProps) {
  return (
    <div
      data-testid="product-detail-not-found"
      className="space-y-3 rounded-lg border border-border p-6 text-sm"
    >
      <h2 className="text-base font-semibold text-foreground">Product not found</h2>
      <p className="text-muted-foreground">
        <span className="font-mono text-xs">{productId}</span> is not available. Products disappear
        from the API when they are archived — the SKUs and attribute values stay in the database.
      </p>
      <Link href="/admin/catalog/products" className="text-sm font-semibold hover:underline">
        Back to products
      </Link>
    </div>
  );
}
