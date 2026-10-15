import type { PropsWithChildren } from "react";
import Link from "next/link";
import AdminNav from "./nav";
import SignOutButton from "./sign-out-button";
import IdentityBadge from "./identity-badge";

/**
 * Layout shell for the back-office area: title bar, gated navigation and the current identity
 * (roles + super-user state) so it is obvious whose permissions are in play.
 */
export default function AdminLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
              Original Pal <span className="text-muted-foreground">/ admin</span>
            </Link>
            <AdminNav />
          </div>

          <div className="flex items-center gap-3">
            <IdentityBadge />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
