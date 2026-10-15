import { catalogKeys } from "@/data/query-keys";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, type PageParams } from "@/lib/types/api";
import type { AttributeDefinition } from "@/lib/types/catalog";
import { useCatalogPage } from "./_catalogQuery";

/** `GET /api/attributes/` (public). Soft-deleted definitions are excluded by the backend. */
export function useGetAttributeDefinitions({
  page = DEFAULT_PAGE,
  size = DEFAULT_PAGE_SIZE,
}: PageParams = {}) {
  const result = useCatalogPage<AttributeDefinition>({
    queryKey: catalogKeys.attributes.list({ page, size }),
    url: "/attributes/",
    page,
    size,
  });

  return { definitions: result.items, ...result };
}

export default useGetAttributeDefinitions;
