import type { PropsWithChildren } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { AuthGuard } from "@/components/ui/auth-guard";

/**
 * Route layer (Level 2): the whole `/admin` area requires an authenticated session.
 * Per-screen permissions (users:read, roles:read, ...) are enforced by the pages below and,
 * authoritatively, by the backend.
 */
export default function AdminSectionLayout({ children }: PropsWithChildren) {
  return (
    <AuthGuard>
      <AdminLayout>{children}</AdminLayout>
    </AuthGuard>
  );
}
