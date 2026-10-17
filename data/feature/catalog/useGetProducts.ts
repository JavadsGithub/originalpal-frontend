import { catalogKeys } from "@/data/query-keys";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/lib/types/api";
import type { Product, ProductStatus } from "@/lib/types/catalog";
import { useCatalogPage } from "./_catalogQuery";

export interface GetProductsParams {
  page?: number;
  size?: number;
  status?: ProductStatus;
  categoryId?: string;
  brandId?: string;
  search?: string;
}

/**
 * `GET /api/products/` (public) with the four server-side filters the backend exposes:
 * `status`, `category_id`, `brand_id`, `search`. An unknown `status` value is a FastAPI 422
 * (`{detail:[...]}`), which is why the filter is a select, never a free-text field.
 */
export function useGetProducts({
  page = DEFAULT_PAGE,
  size = DEFAULT_PAGE_SIZE,
  status,
  categoryId,
  brandId,
  search,
}: GetProductsParams = {}) {
  const result = useCatalogPage<Product>({
    queryKey: catalogKeys.products.list({
      page,
      size,
      status,
      categoryId,
      brandId,
      search: search || undefined,
    }),
    url: "/products/",
    params: {
      status,
      category_id: categoryId,
      brand_id: brandId,
      search: search || undefined,
    },
    page,
    size,
  });

  return { products: result.items, ...result };
}

export default useGetProducts;
