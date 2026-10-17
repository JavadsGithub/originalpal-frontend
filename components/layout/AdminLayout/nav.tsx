"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PermissionGate } from "@/components/ui/auth-guard";
import { Permissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export interface AdminNavItem {
  href: string;
  label: string;
  /** Permission the backend enforces for the matching endpoint, when there is one. */
  permission?: string;
}

/**
 * Back-office navigation.
 *
 * Read endpoints drive the gate: users and roles need `users:read` / `roles:read`, the catalog
 * collections are public, and the media library is the odd one out (`uploads:read` is required even
 * to list files).
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users", permission: Permissions.Users_Read },
  { href: "/admin/roles", label: "Roles", permission: Permissions.Roles_Read },
  { href: "/admin/catalog/products", label: "Products" },
  { href: "/admin/catalog/categories", label: "Categories" },
  { href: "/admin/catalog/brands", label: "Brands" },
  { href: "/admin/catalog/attributes", label: "Attributes" },
  { href: "/admin/catalog/media", label: "Media", permission: Permissions.Uploads_Read },
  { href: "/admin/orders", label: "Orders", permission: Permissions.Orders_Read },
];

/**
 * Navigation with per-item permission gates. A link is hidden when the caller lacks the permission
 * the matching read endpoint requires (the route-level `AuthGuard` is the second line of defence —
 * the API is the third).
 */
export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1" aria-label="Administration">
      {ADMIN_NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

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

        if (item.permission) {
          return (
            <PermissionGate key={item.href} permission={item.permission}>
              {link}
            </PermissionGate>
          );
        }

        return link;
      })}
    </nav>
  );
}
