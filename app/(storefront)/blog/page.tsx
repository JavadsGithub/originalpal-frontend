import Link from "next/link";

/**
 * Placeholder: `/blog` is the one navigation entry the API advertises without having an endpoint
 * behind it. Kept so the menu the backend returns never leads to a 404 — the honest state is a page
 * that says the feature does not exist yet.
 */
export default function StorefrontBlogPage() {
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border p-6 text-sm">
      <h1 className="text-lg font-semibold text-foreground">Blog</h1>
      <p className="text-muted-foreground">
        The backend&apos;s navigation links to <code>/blog</code>, but there is no blog endpoint in the
        API — no model, no routes. Nothing was invented here; the link is kept working until the
        backend grows the feature.
      </p>
      <Link href="/search" className="font-semibold hover:underline">
        Browse products →
      </Link>
    </div>
  );
}
