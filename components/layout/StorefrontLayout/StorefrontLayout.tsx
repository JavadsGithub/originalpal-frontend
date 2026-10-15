"use client";

import useGetHomepage from "@/data/feature/storefront/useGetHomepage";
import StorefrontLayoutUI from "./index";

/**
 * Tier 2 injector for the storefront shell: it needs exactly one thing from the API, the navigation
 * that `GET /api/homepage/` returns.
 *
 * The navigation renders empty if that request fails — a shell that hides its menu is still a usable
 * storefront, whereas one that throws would take the whole page with it.
 */
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const { navigation } = useGetHomepage();

  return <StorefrontLayoutUI navigation={navigation}>{children}</StorefrontLayoutUI>;
}
