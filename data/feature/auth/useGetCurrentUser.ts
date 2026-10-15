import { customFetcher } from "@/lib/fetcher";
import type { User } from "@/lib/types/auth";
import { useQuery } from "@tanstack/react-query";

export interface UseGetCurrentUserReturn {
  user: User | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

export function useGetCurrentUser(enabled: boolean = true): UseGetCurrentUserReturn {
  const query = useQuery<User>({
    queryKey: ["auth", "me"],
    queryFn: () => customFetcher<User>({ url: "/auth/me", method: "GET" }),
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useGetCurrentUser;
