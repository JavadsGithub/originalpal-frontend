import AdminRolesTable from "@/components/feature/role/RolesTable/AdminRolesTable";
import { AuthGuard } from "@/components/ui/auth-guard";
import { Permissions } from "@/lib/permissions";

/** `GET /api/roles/` requires `roles:read`. */
export default function AdminRolesPage() {
  return (
    <AuthGuard permission={Permissions.Roles_Read}>
      <AdminRolesTable />
    </AuthGuard>
  );
}
