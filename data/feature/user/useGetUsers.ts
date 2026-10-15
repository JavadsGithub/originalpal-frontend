import { customFetcher } from "@/lib/fetcher";
import type { PaginatedPayload, User } from "@/lib/types/auth";
import { useQuery } from "@tanstack/react-query";

export interface UseGetUsersParams {
  page?: number;
  size?: number;
}

export interface UseGetUsersReturn {
  users: User[];
  total: number;
  page: number;
  size: number;
  pages: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

export function useGetUsers(params: UseGetUsersParams = {}): UseGetUsersReturn {
  const { page = 1, size = 50 } = params;

  const query = useQuery<PaginatedPayload<User>>({
    queryKey: ["users", { page, size }],
    queryFn: () =>
      customFetcher<PaginatedPayload<User>>({
        url: "/users/",
        method: "GET",
        params: { page, size },
      }),
  });

  return {
    users: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? page,
    size: query.data?.size ?? size,
    pages: query.data?.pages ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useGetUsers;
