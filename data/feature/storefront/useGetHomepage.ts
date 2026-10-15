import { useQuery } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import type { PublicHomepage } from "@/lib/types/storefront";
import { storefrontKeys } from "@/data/query-keys";

/**
 * `GET /api/homepage/` — the public homepage: **active** blocks ordered by `display_order`, plus the
 * five navigation entries (Categories, Search, Cart, Account, Blog) the backend always returns.
 *
 * The screen works with zero blocks: an empty homepage is a valid state an admin creates by not
 * adding any.
 */
export function useGetHomepage() {
  const query = useQuery<PublicHomepage>({
    queryKey: storefrontKeys.homepage(),
    queryFn: () => customFetcher<PublicHomepage>({ url: "/homepage/", method: "GET" }),
  });

  return {
    blocks: query.data?.blocks ?? [],
    navigation: query.data?.navigation ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? toApiError(query.error) : null,
    refetch: () => void query.refetch(),
  };
}

export default useGetHomepage;
