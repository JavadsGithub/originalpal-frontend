import Link from "next/link";

/**
 * Placeholder: `/cart` is one of the five navigation entries the backend returns, and carts are a
 * later slice (`/api/carts`). The route exists so the menu never 404s.
 */
export default function StorefrontCartPage() {
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border p-6 text-sm">
      <h1 className="text-lg font-semibold text-foreground">Cart</h1>
      <p className="text-muted-foreground">
        Not built yet. The backend exposes <code>/api/carts</code> (guest and customer carts) plus
        delivery options, checkout and orders — that is the next slice.
      </p>
      <Link href="/search" className="font-semibold hover:underline">
        Keep browsing →
      </Link>
    </div>
  );
}
