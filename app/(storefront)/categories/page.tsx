import StorefrontCategoryIndex from "@/components/feature/storefront/CategoryIndex/StorefrontCategoryIndex";

/** Category index — `GET /api/categories/` is public, so this needs no session. */
export default function StorefrontCategoriesPage() {
  return <StorefrontCategoryIndex />;
}
