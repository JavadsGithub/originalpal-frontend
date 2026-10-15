import Link from "next/link";
import BackendStatus from "@/components/feature/system/BackendStatus/BackendStatus";
import { PermissionGate } from "@/components/ui/auth-guard";
import { Permissions } from "@/lib/permissions";

const SECTIONS = [
  {
    href: "/admin/users",
    title: "Users",
    description:
      "Create accounts, activate them (new users start inactive), assign roles and delete accounts.",
    permission: Permissions.Users_Read,
  },
  {
    href: "/admin/roles",
    title: "Roles & permissions",
    description:
      "Create roles and choose from the backend's 49 permissions. Roles are the only way access is granted.",
    permission: Permissions.Roles_Read,
  },
];

/** Route layer (Level 2): overview of the back office, composed from ready-made components. */
export default function AdminOverviewPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Administration</h1>
        <p className="text-sm text-muted-foreground">
          Every screen below is gated by the permission the matching API endpoint requires.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <PermissionGate
            key={section.href}
            permission={section.permission}
            fallback={
              <div className="rounded-xl border border-dashed border-border px-5 py-4 opacity-60">
                <span className="block text-sm font-semibold text-muted-foreground">
                  {section.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Requires {section.permission}
                </span>
              </div>
            }
          >
            <Link
              href={section.href}
              className="block rounded-xl border border-border px-5 py-4 transition hover:border-foreground/40"
            >
              <span className="block text-sm font-semibold text-foreground">{section.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {section.description}
              </span>
            </Link>
          </PermissionGate>
        ))}
      </div>

      <BackendStatus />
    </div>
  );
}
