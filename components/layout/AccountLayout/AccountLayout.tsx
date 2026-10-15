"use client";

import { useAuth } from "@/components/layout/auth-provider";
import AccountLayoutUI from "./index";

/**
 * Tier 2 injector for the account shell: it only needs the signed-in identity for the header line
 * and the sign-out button.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const userLabel = user
    ? `${user.first_name} ${user.last_name} · ${user.username} · ${user.email}`
    : "";

  return <AccountLayoutUI userLabel={userLabel}>{children}</AccountLayoutUI>;
}
