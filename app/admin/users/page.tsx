import AdminUsersTable from "@/components/feature/user/UsersTable/AdminUsersTable";
import { AuthGuard } from "@/components/ui/auth-guard";
import { Permissions } from "@/lib/permissions";

/**
 * `GET /api/users/` requires `users:read`; super users bypass permission checks on the backend, and
 * `AuthGuard` mirrors that rule. Routes import dependency injectors only.
 */
export default function AdminUsersPage() {
  return (
    <AuthGuard permission={Permissions.Users_Read}>
      <AdminUsersTable />
    </AuthGuard>
  );
}
