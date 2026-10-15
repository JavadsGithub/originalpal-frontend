import { catalogKeys } from "@/data/query-keys";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, type PageParams } from "@/lib/types/api";
import type { Brand } from "@/lib/types/catalog";
import { useCatalogPage } from "./_catalogQuery";

/** `GET /api/brands/` (public). `GET /brands/{id}` requires `brands:read`, the list does not. */
export function useGetBrands({ page = DEFAULT_PAGE, size = DEFAULT_PAGE_SIZE }: PageParams = {}) {
  const result = useCatalogPage<Brand>({
    queryKey: catalogKeys.brands.list({ page, size }),
    url: "/brands/",
    page,
    size,
  });

  return { brands: result.items, ...result };
}

export default useGetBrands;
