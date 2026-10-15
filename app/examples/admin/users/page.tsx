import AdminUsersTable from "@/components/feature/user/UsersTable/AdminUsersTable";
import { AuthGuard } from "@/components/ui/auth-guard";
import { Permissions } from "@/lib/permissions";

/**
 * Example route showing the framework's route layer: an `AuthGuard` gate plus a single dependency
 * injector. The production screen lives at `/admin/users`.
 */
export default function AdminUsersExamplePage() {
  return (
    <AuthGuard permission={Permissions.Users_Read}>
      <div className="container mx-auto py-8">
        <AdminUsersTable />
      </div>
    </AuthGuard>
  );
}
