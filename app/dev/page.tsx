import Link from "next/link";
import BackendStatus from "@/components/feature/system/BackendStatus/BackendStatus";

const CUSTOMER_LINKS = [
  {
    href: "/register",
    label: "Create an account",
    description: "Self-registration (POST /api/auth/register) — the account is active immediately.",
  },
  {
    href: "/account",
    label: "Your account",
    description: "Profile (PUT /api/auth/me) and the address book (/api/me/addresses/).",
  },
  {
    href: "/forgot-password",
    label: "Password recovery",
    description: "Request a reset token, then set a new password. Needs no session.",
  },
];

const ADMIN_LINKS = [
  {
    href: "/admin/users",
    label: "Users",
    description: "Create, activate and delete accounts, and assign roles. Requires users:read.",
  },
  {
    href: "/admin/roles",
    label: "Roles & permissions",
    description: "Build roles from the backend's 49 permissions. Requires roles:read.",
  },
  {
    href: "/admin/catalog/products",
    label: "Catalog",
    description:
      "Products, SKUs, categories, attributes, brands and uploads. Reads are public, writes need a permission.",
  },
];

const EXAMPLE_LINKS = [
  {
    href: "/examples/admin/invoices",
    label: "Examples · Invoices",
    description: "Mock-data showcase of the component framework (no backend counterpart).",
  },
  {
    href: "/examples/me/invoices",
    label: "Examples · My invoices",
    description: "Same abstract UI, a different dependency injector.",
  },
];

/**
 * Route layer (Level 2): composes dependency injectors only — no data hooks, no UI primitives.
 * The sign-in page is `/login`; the backend's seed account is `admin` / `Secret123`.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-6 py-16">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Original Pal
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Storefront and back-office client for the{" "}
          <span className="font-mono">originalpal-server-python</span> API.
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Sign in with the seeded account{" "}
          <span className="font-mono">admin</span> /{" "}
          <span className="font-mono">Secret123</span>.
        </p>
      </header>

      <BackendStatus />

      <nav className="grid w-full max-w-xl gap-3">
        <Link
          href="/login"
          className="rounded-xl border border-neutral-300 px-5 py-4 text-sm font-semibold text-neutral-900 transition hover:border-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:hover:border-neutral-100"
        >
          Sign in →
        </Link>

        {[...CUSTOMER_LINKS, ...ADMIN_LINKS, ...EXAMPLE_LINKS].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl border border-neutral-200 px-5 py-4 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
          >
            <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {link.label}
            </span>
            <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
              {link.description}
            </span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
