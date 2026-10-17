import { catalogKeys } from "@/data/query-keys";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  type PageParams,
} from "@/lib/types/api";
import type { Category } from "@/lib/types/catalog";
import { useCatalogPage } from "./_catalogQuery";

export interface GetCategoriesParams extends PageParams {
  /** `GET /categories/?parent_id=` filters one level; omit for the whole list. */
  parentId?: string | null;
}

/** `GET /api/categories/` (public) — filter by `parent_id`, then build the tree in the UI. */
export function useGetCategories({ page = DEFAULT_PAGE, size = DEFAULT_PAGE_SIZE, parentId }: GetCategoriesParams = {}) {
  const result = useCatalogPage<Category>({
    queryKey: catalogKeys.categories.list({ page, size, parentId: parentId ?? undefined }),
    url: "/categories/",
    params: { parent_id: parentId ?? undefined },
    page,
    size,
  });

  return { categories: result.items, ...result };
}

export default useGetCategories;
