import { storefrontKeys } from "@/data/query-keys";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/lib/types/api";
import type { PublicProductSummary } from "@/lib/types/storefront";
import { usePagedQuery } from "@/data/feature/_pagedQuery";

export interface GetPublicProductsParams {
  page?: number;
  size?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
}

/**
 * `GET /api/catalog/products/` — the public listing: **published products with at least one active
 * SKU**, newest first.
 *
 * The three filters are exact matches on `category_id` / `brand_id` plus a `search` that the backend
 * applies to the title, the slug and the SKU codes (`ILIKE %…%`). `category_id` does *not* include
 * subcategories, so a parent category page has to link to its children instead of pretending to
 * cover them. `size` above 100 is a FastAPI 422, so it is never requested.
 */
export function useGetPublicProducts({
  page = DEFAULT_PAGE,
  size = DEFAULT_PAGE_SIZE,
  search,
  categoryId,
  brandId,
}: GetPublicProductsParams = {}) {
  // `search` is free text from a shopping input: a whitespace-only term would be a request that
  // matches nothing useful (the backend wraps it in `%…%`), so it is dropped instead of sent.
  const term = search?.trim() || undefined;

  const result = usePagedQuery<PublicProductSummary>({
    queryKey: storefrontKeys.products.list({
      page,
      size,
      search: term,
      categoryId,
      brandId,
    }),
    url: "/catalog/products/",
    params: {
      search: term,
      category_id: categoryId || undefined,
      brand_id: brandId || undefined,
    },
    page,
    size,
  });

  return { products: result.items, ...result };
}

export default useGetPublicProducts;
