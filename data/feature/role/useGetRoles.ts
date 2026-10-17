import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import type { Role } from "@/lib/types/auth";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  normalizePage,
  type PageParams,
  type PaginatedPayload,
} from "@/lib/types/api";
import { roleKeys } from "@/data/query-keys";
import { useQuery } from "@tanstack/react-query";

/** `GET /api/roles/` — requires `roles:read` (super users bypass it). */
export function useGetRoles(params: PageParams = {}) {
  const page = params.page ?? DEFAULT_PAGE;
  const size = params.size ?? DEFAULT_PAGE_SIZE;

  const query = useQuery<PaginatedPayload<Role>>({
    queryKey: roleKeys.list({ page, size }),
    queryFn: () =>
      customFetcher<PaginatedPayload<Role>>({
        url: "/roles/",
        method: "GET",
        params: { page, size },
      }),
  });

  const pageData = normalizePage(query.data, { page, size });

  return {
    roles: pageData.items,
    total: pageData.total,
    page: pageData.page,
    size: pageData.size,
    pages: pageData.pages ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? toApiError(query.error) : null,
    refetch: query.refetch,
  };
}

export default useGetRoles;
