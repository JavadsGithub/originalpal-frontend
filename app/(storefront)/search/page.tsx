import StorefrontSearch from "@/components/feature/storefront/StorefrontSearch/StorefrontSearch";

export interface StorefrontSearchPageProps {
  searchParams: Promise<{ q?: string; category?: string; brand?: string }>;
}

/**
 * Public search / listing (`GET /api/catalog/products/`).
 *
 * The filters live in the query string so a result page is linkable; `/categories/{id}` links here
 * with the category already selected.
 */
export default async function StorefrontSearchPage({ searchParams }: StorefrontSearchPageProps) {
  const { q, category, brand } = await searchParams;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Browse products</h1>
        <p className="text-xs text-muted-foreground">
          Only published products with an active variant are listed — that is the public catalog&apos;s
          own rule, not a filter this page applies.
        </p>
      </header>

      <StorefrontSearch
        initialFilters={{
          search: q ?? "",
          categoryId: category ?? "",
          brandId: brand ?? "",
        }}
      />
    </div>
  );
}
