"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/layout/auth-provider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { HomepageNavigationItem } from "@/lib/types/storefront";

export interface StorefrontLayoutTranslations {
  brandName: string;
  brandTagline: string;
  searchPlaceholder: string;
  searchButtonText: string;
  signInText: string;
  accountText: string;
  backOfficeText: string;
}

export interface StorefrontLayoutUIProps {
  /** From `GET /api/homepage/` — the backend's own five entries. */
  navigation: HomepageNavigationItem[];
  children: ReactNode;
  translations?: Partial<StorefrontLayoutTranslations>;
}

const defaultTranslations: StorefrontLayoutTranslations = {
  brandName: "Original Pal",
  brandTagline: "Storefront",
  searchPlaceholder: "Search products",
  searchButtonText: "Search",
  signInText: "Sign in",
  accountText: "Your account",
  backOfficeText: "Back office",
};

/**
 * Shell for the public storefront.
 *
 * The navigation is the API's (`GET /api/homepage/` → `navigation`), not a hardcoded list, so an
 * entry the backend adds or renames shows up without a deploy. Two of the five entries have no screen
 * behind them yet (`/cart`, `/blog`); both still render, on a page that says so.
 */
export default function StorefrontLayoutUI({
  navigation,
  children,
  translations = {},
}: StorefrontLayoutUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [term, setTerm] = useState("");

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = term.trim();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="space-y-0.5">
              <span className="block text-lg font-bold tracking-tight text-foreground">
                {t.brandName}
              </span>
              <span className="block text-xs text-muted-foreground">{t.brandTagline}</span>
            </Link>

            <form onSubmit={submitSearch} className="flex flex-1 items-center gap-2 sm:max-w-sm">
              <Input
                aria-label={t.searchPlaceholder}
                placeholder={t.searchPlaceholder}
                value={term}
                onChange={(event) => setTerm(event.target.value)}
              />
              <Button type="submit" size="sm">
                {t.searchButtonText}
              </Button>
            </form>

            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <Link
                  href="/account"
                  className="text-xs font-semibold text-foreground hover:underline"
                >
                  {user ? `${user.first_name} · ` : ""}
                  {t.accountText}
                </Link>
              ) : (
                <Link href="/login" className="text-xs font-semibold text-foreground hover:underline">
                  {t.signInText}
                </Link>
              )}
              <Link
                href="/admin"
                className="text-xs text-muted-foreground hover:underline"
              >
                {t.backOfficeText}
              </Link>
            </div>
          </div>

          {navigation.length > 0 && (
            <nav className="flex flex-wrap gap-1" aria-label="Storefront">
              {navigation.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <Link
                    key={`${item.label}-${item.href}`}
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
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-muted-foreground">
          <span>
            {t.brandName} — Next.js client for `originalpal-server-python`
          </span>
          <span className="flex gap-3">
            <Link href="/admin" className="hover:underline">
              {t.backOfficeText}
            </Link>
            <Link href="/dev" className="hover:underline">
              Integration status
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
