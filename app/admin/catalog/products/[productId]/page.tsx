import Link from "next/link";
import ProductDetail from "@/components/feature/catalog/ProductDetail/ProductDetail";
import { AuthGuard } from "@/components/ui/auth-guard";

export interface AdminProductDetailPageProps {
  params: Promise<{ productId: string }>;
}

/**
 * Product detail: publication checklist, SKUs (price + stock) and the attribute values the category
 * demands. `GET /api/products/{id}` is public, and an archived product answers **404** — the
 * injector renders that as "not found" rather than an empty screen.
 */
export default async function AdminProductDetailPage({ params }: AdminProductDetailPageProps) {
  const { productId } = await params;

  return (
    <AuthGuard>
      <div className="space-y-6">
        <nav className="text-xs text-muted-foreground">
          <Link href="/admin/catalog/products" className="hover:underline">
            Products
          </Link>
          <span className="px-1">/</span>
          <span className="font-mono">{productId}</span>
        </nav>

        <ProductDetail productId={productId} />
      </div>
    </AuthGuard>
  );
}
