import AdminAttributeDefinitionsTable from "@/components/feature/catalog/AttributeDefinitionsTable/AdminAttributeDefinitionsTable";
import { AuthGuard } from "@/components/ui/auth-guard";

/** Attribute reads are public; `attributes:create|update|delete` gate the mutations. */
export default function AdminAttributesPage() {
  return (
    <AuthGuard>
      <AdminAttributeDefinitionsTable />
    </AuthGuard>
  );
}
