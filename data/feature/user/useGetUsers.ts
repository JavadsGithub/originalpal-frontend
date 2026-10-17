import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import type { User } from "@/lib/types/auth";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  normalizePage,
  type PageParams,
  type PaginatedPayload,
} from "@/lib/types/api";
import { userKeys } from "@/data/query-keys";
import { useQuery } from "@tanstack/react-query";

/**
 * `GET /api/users/` — requires `users:read` (super users bypass the check).
 *
 * Two backend behaviours are encoded here:
 *  - the collection path is declared with a trailing slash; without it FastAPI replies 307;
 *  - the payload is `fastapi_pagination.Page` → `{items,total,page,size,pages}`.
 */
export function useGetUsers(params: PageParams = {}) {
  const page = params.page ?? DEFAULT_PAGE;
  const size = params.size ?? DEFAULT_PAGE_SIZE;

  const query = useQuery<PaginatedPayload<User>>({
    queryKey: userKeys.list({ page, size }),
    queryFn: () =>
      customFetcher<PaginatedPayload<User>>({
        url: "/users/",
        method: "GET",
        params: { page, size },
      }),
  });

  const pageData = normalizePage(query.data, { page, size });

  return {
    users: pageData.items,
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

export default useGetUsers;
