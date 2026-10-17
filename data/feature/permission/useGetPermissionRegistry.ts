import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import type { Permission } from "@/lib/types/auth";
import { authKeys } from "@/data/query-keys";
import { useQuery } from "@tanstack/react-query";

/**
 * `GET /api/auth/permissions` — requires `permissions:read`.
 *
 * Returns the backend's authoritative registry (id, title, description). Note:
 *  - the endpoint does **not** include policy objects, despite the controller's intent;
 *  - `@/lib/permissions` already carries every id at build time (generated from the same registry),
 *    so use this hook when you need titles/descriptions at runtime rather than ids.
 */
export function useGetPermissionRegistry(options?: { enabled?: boolean }) {
  const query = useQuery<Permission[]>({
    queryKey: authKeys.permissions(),
    queryFn: () =>
      customFetcher<Permission[]>({ url: "/auth/permissions", method: "GET" }),
    staleTime: 30 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });

  return {
    permissions: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? toApiError(query.error) : null,
    refetch: query.refetch,
  };
}

export default useGetPermissionRegistry;
