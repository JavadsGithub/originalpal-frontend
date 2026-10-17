import AdminCategoriesTable from "@/components/feature/catalog/CategoriesTable/AdminCategoriesTable";
import { AuthGuard } from "@/components/ui/auth-guard";

/** Category reads are public; create/update/delete and the attribute links are gated per action. */
export default function AdminCategoriesPage() {
  return (
    <AuthGuard>
      <AdminCategoriesTable />
    </AuthGuard>
  );
}
