import AdminMediaLibrary from "@/components/feature/catalog/MediaLibrary/AdminMediaLibrary";
import { AuthGuard } from "@/components/ui/auth-guard";
import { Permissions } from "@/lib/permissions";

/**
 * Unlike the catalog itself, *every* file endpoint is permission-guarded — listing needs
 * `uploads:read`, so this screen is the one catalog route with a real route-level gate.
 */
export default function AdminMediaPage() {
  return (
    <AuthGuard permission={Permissions.Uploads_Read}>
      <AdminMediaLibrary />
    </AuthGuard>
  );
}
