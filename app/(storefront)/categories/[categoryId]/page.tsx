import Link from "next/link";
import StorefrontProductGrid from "@/components/feature/storefront/ProductGrid/StorefrontProductGrid";
import CategoryBreadcrumb from "@/components/feature/storefront/CategoryIndex/CategoryBreadcrumb";

export interface StorefrontCategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

/**
 * One category's products.
 *
 * `category_id` is an exact match on the public endpoint (verified live: a parent category returns 0
 * even when products sit in its child), so this page shows exactly its own shelf and points at the
 * children for the rest.
 */
export default async function StorefrontCategoryPage({ params }: StorefrontCategoryPageProps) {
  const { categoryId } = await params;

  return (
    <div className="space-y-6">
      <CategoryBreadcrumb categoryId={categoryId} />

      <StorefrontProductGrid categoryId={categoryId} />

      <p className="text-xs text-muted-foreground">
        Looking for something else?{" "}
        <Link href="/categories" className="font-semibold hover:underline">
          All categories
        </Link>{" "}
        or{" "}
        <Link href="/search" className="font-semibold hover:underline">
          search the catalog
        </Link>
        .
      </p>
    </div>
  );
}
