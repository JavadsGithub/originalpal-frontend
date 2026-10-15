"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PermissionGate } from "@/components/ui/auth-guard";
import { Permissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export interface AdminNavItem {
  href: string;
  label: string;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/roles", label: "Roles" },
];

/**
 * Navigation with per-item permission gates.
 *
 * `GET /api/users/` and `GET /api/roles/` are enforced by `users:read` / `roles:read`, so links to
 * those screens are hidden without the matching permission (the route-level `AuthGuard` is the
 * second line of defence — the API is the third).
 */
export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1" aria-label="Administration">
      {ADMIN_NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

        const link = (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );

        if (item.href === "/admin/users") {
          return (
            <PermissionGate key={item.href} permission={Permissions.Users_Read}>
              {link}
            </PermissionGate>
          );
        }

        if (item.href === "/admin/roles") {
          return (
            <PermissionGate key={item.href} permission={Permissions.Roles_Read}>
              {link}
            </PermissionGate>
          );
        }

        return link;
      })}
    </nav>
  );
}
