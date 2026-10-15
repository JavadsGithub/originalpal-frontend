import UsersTable from "@/components/feature/user/UsersTable/UsersTable";
import { AuthGuard } from "@/components/ui/auth-guard";
import { Permissions } from "@/lib/permissions";

export default function AdminUsersPage() {
  return (
    <AuthGuard permission={Permissions.Users_Read}>
      <div className="container mx-auto py-8">
        <UsersTable />
      </div>
    </AuthGuard>
  );
}
