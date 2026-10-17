import { catalogKeys } from "@/data/query-keys";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, type PageParams } from "@/lib/types/api";
import type { UploadedFile } from "@/lib/types/catalog";
import { useCatalogPage } from "./_catalogQuery";

/** `GET /api/files` — requires `uploads:read`. Note: no trailing slash on this route. */
export function useGetFiles({ page = DEFAULT_PAGE, size = DEFAULT_PAGE_SIZE }: PageParams = {}) {
  const result = useCatalogPage<UploadedFile>({
    queryKey: catalogKeys.files.list({ page, size }),
    url: "/files",
    page,
    size,
  });

  return { files: result.items, ...result };
}

export default useGetFiles;
