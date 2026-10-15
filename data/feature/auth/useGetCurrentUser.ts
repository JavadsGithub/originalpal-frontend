import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import type { User } from "@/lib/types/auth";
import { authKeys } from "@/data/query-keys";
import { useQuery } from "@tanstack/react-query";

export interface UseGetCurrentUserReturn {
  user: User | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  refetch: () => Promise<unknown>;
}

/**
 * `GET /api/auth/me`.
 *
 * Because the access token is memory-only, the first call after a reload is answered by the
 * fetcher's silent `POST /api/auth/refresh` (HttpOnly cookie) and then replayed — so a user with a
 * live refresh cookie is restored without any UI involvement. `retry: false` keeps an
 * unauthenticated visitor from hammering a 401 endpoint.
 */
export function useGetCurrentUser(enabled: boolean = true): UseGetCurrentUserReturn {
  const query = useQuery<User>({
    queryKey: authKeys.me(),
    queryFn: () => customFetcher<User>({ url: "/auth/me", method: "GET" }),
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? toApiError(query.error) : null,
    refetch: query.refetch,
  };
}

export default useGetCurrentUser;
