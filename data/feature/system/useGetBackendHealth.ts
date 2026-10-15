import { fetchEnvelope } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import { systemKeys } from "@/data/query-keys";
import { useQuery } from "@tanstack/react-query";

export interface UseGetBackendHealthReturn {
  /** True when the backend answered `GET /api/ping`. */
  isReachable: boolean;
  /** Backend message (`"pong"`), or null while loading / on failure. */
  message: string | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<unknown>;
}

/**
 * Round-trips `GET /api/ping` **through the Next.js proxy**, so it validates the whole chain:
 * browser → same-origin proxy → FastAPI. The endpoint needs no authentication.
 *
 * Note it uses `fetchEnvelope`, not `customFetcher`: `/ping` returns `payload: null` and carries
 * its answer in `message`.
 */
export function useGetBackendHealth(): UseGetBackendHealthReturn {
  const query = useQuery({
    queryKey: systemKeys.backendHealth(),
    queryFn: () =>
      fetchEnvelope<string>({ url: "/ping", method: "GET", skipAuthRefresh: true }),
    retry: false,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  return {
    isReachable: query.isSuccess && Boolean(query.data?.success),
    message: query.data?.message ?? null,
    isLoading: query.isLoading,
    error: query.error ? toApiError(query.error) : null,
    refetch: query.refetch,
  };
}

export default useGetBackendHealth;
