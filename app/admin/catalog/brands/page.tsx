import AdminBrandsTable from "@/components/feature/catalog/BrandsTable/AdminBrandsTable";
import { AuthGuard } from "@/components/ui/auth-guard";

/** Brand reads are public; `brands:create|update|delete` gate the mutations. */
export default function AdminBrandsPage() {
  return (
    <AuthGuard>
      <AdminBrandsTable />
    </AuthGuard>
  );
}
