"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/layout/auth-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AccountNavItem {
  href: string;
  label: string;
}

export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
  { href: "/account", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
];

export interface AccountLayoutUIProps {
  userLabel: string;
  children: ReactNode;
}

/**
 * Shell for the customer area: header with the signed-in identity, a two-item nav and sign-out.
 *
 * There is no permission check here on purpose — a freshly registered customer has **zero**
 * permissions (their account has no roles), so anything permission-gated would lock them out of
 * their own profile. `AuthGuard` in the route only requires a session.
 */
export default function AccountLayoutUI({ userLabel, children }: AccountLayoutUIProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Your account</h1>
          <p className="text-xs text-muted-foreground">{userLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/" className="text-xs text-muted-foreground hover:underline">
            Home
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1" aria-label="Account">
        {ACCOUNT_NAV_ITEMS.map((item) => {
          const isActive = item.href === "/account" ? pathname === "/account" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
