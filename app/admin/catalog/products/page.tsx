import AdminProductsTable from "@/components/feature/catalog/ProductsTable/AdminProductsTable";
import { AuthGuard } from "@/components/ui/auth-guard";

/**
 * `GET /api/products/` is public, so listing products needs no permission — but the screen lives in
 * the back office, so it still requires a session. Each lifecycle action is gated on its own id
 * inside the injector (`products:create|update|publish|unpublish|delete`).
 */
export default function AdminProductsPage() {
  return (
    <AuthGuard>
      <AdminProductsTable />
    </AuthGuard>
  );
}
