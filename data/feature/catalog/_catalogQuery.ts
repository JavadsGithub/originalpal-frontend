import { useQuery } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  normalizePage,
  type PaginatedPayload,
} from "@/lib/types/api";

export interface PagedQueryConfig {
  queryKey: readonly unknown[];
  /** Path with the trailing slash the backend expects, e.g. `/products/`. */
  url: string;
  params?: Record<string, string | number | boolean | undefined>;
  page?: number;
  size?: number;
  enabled?: boolean;
}

export interface PagedQueryResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => void;
}

/**
 * Shared page-shaped read used by every catalog collection.
 *
 * Collection endpoints need the trailing slash (without it FastAPI answers 307), and `undefined`
 * filter values must be dropped rather than sent as `undefined` strings — axios already does that
 * for `params`, which is why filters are passed through untyped-but-checked here.
 */
export function useCatalogPage<T>({
  queryKey,
  url,
  params,
  page = DEFAULT_PAGE,
  size = DEFAULT_PAGE_SIZE,
  enabled = true,
}: PagedQueryConfig): PagedQueryResult<T> {
  const query = useQuery<PaginatedPayload<T>>({
    queryKey,
    enabled,
    queryFn: () =>
      customFetcher<PaginatedPayload<T>>({
        url,
        method: "GET",
        params: { page, size, ...params },
      }),
  });

  const pageData = normalizePage(query.data, { page, size });

  return {
    items: pageData.items,
    total: pageData.total,
    page: pageData.page,
    size: pageData.size,
    pages: pageData.pages ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? toApiError(query.error) : null,
    refetch: () => void query.refetch(),
  };
}
