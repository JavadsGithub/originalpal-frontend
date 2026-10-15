import StorefrontLayout from "@/components/layout/StorefrontLayout/StorefrontLayout";

/**
 * Public storefront shell (route group, so the URLs stay `/`, `/search`, `/categories`, `/products/…`).
 * Nothing here is guarded: the shell is the same for a signed-out shopper and a signed-in customer.
 */
export default function StorefrontRootLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontLayout>{children}</StorefrontLayout>;
}
