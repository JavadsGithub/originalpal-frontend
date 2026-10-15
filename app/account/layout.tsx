import AccountLayout from "@/components/layout/AccountLayout/AccountLayout";
import { AuthGuard } from "@/components/ui/auth-guard";

/**
 * Customer area. The guard only requires a **session** — customer accounts carry no permissions
 * (a self-registered account has no roles at all), so gating on one would lock customers out.
 */
export default function AccountRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AccountLayout>{children}</AccountLayout>
    </AuthGuard>
  );
}
