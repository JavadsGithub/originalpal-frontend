import { catalogKeys } from "@/data/query-keys";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/lib/types/api";
import type { CategoryAttributeListEntry } from "@/lib/types/catalog";
import { useCatalogPage } from "./_catalogQuery";

export interface GetCategoryAttributesParams {
  categoryId: string;
  page?: number;
  size?: number;
}

/**
 * `GET /api/categories/{categoryId}/attributes/` (public).
 *
 * Each entry wraps a link plus `inherited` / `source_category_id`, because the list includes the
 * attributes declared by **ancestor** categories. Only the non-inherited ones can be edited here —
 * that is what `source_category_id` is for.
 */
export function useGetCategoryAttributes({
  categoryId,
  page = DEFAULT_PAGE,
  size = DEFAULT_PAGE_SIZE,
}: GetCategoryAttributesParams) {
  const result = useCatalogPage<CategoryAttributeListEntry>({
    queryKey: catalogKeys.attributes.forCategory(categoryId),
    url: `/categories/${categoryId}/attributes/`,
    page,
    size,
    enabled: Boolean(categoryId),
  });

  return { entries: result.items, ...result };
}

export default useGetCategoryAttributes;
