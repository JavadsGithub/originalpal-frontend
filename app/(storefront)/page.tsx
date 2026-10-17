import Link from "next/link";
import StorefrontHomepage from "@/components/feature/storefront/HomepageBlocks/StorefrontHomepage";

/**
 * Storefront home: the editor-managed blocks from `GET /api/homepage/`.
 *
 * With no blocks the screen explains where they come from instead of showing an empty shell — a fresh
 * install legitimately has none.
 */
export default function StorefrontHomePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Featured</h1>
        <p className="text-sm text-muted-foreground">
          Blocks are managed in the back office and served by <code>GET /api/homepage/</code>.{" "}
          <Link href="/search" className="font-semibold hover:underline">
            Browse all products →
          </Link>
        </p>
      </header>

      <StorefrontHomepage />
    </div>
  );
}
