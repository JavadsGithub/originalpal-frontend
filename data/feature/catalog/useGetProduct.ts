import { useQuery } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import { catalogKeys } from "@/data/query-keys";
import type { Product } from "@/lib/types/catalog";

/**
 * `GET /api/products/{id}` (public).
 *
 * Archiving a product (`DELETE`) removes it from every listing *and* makes this endpoint answer
 * 404, so a detail screen that is open when someone archives the product surfaces "not found"
 * rather than a stale copy.
 */
export function useGetProduct(productId: string | null, options?: { enabled?: boolean }) {
  const query = useQuery<Product>({
    queryKey: catalogKeys.products.detail(productId ?? ""),
    enabled: Boolean(productId) && (options?.enabled ?? true),
    queryFn: () => customFetcher<Product>({ url: `/products/${productId}`, method: "GET" }),
  });

  return {
    product: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? toApiError(query.error) : null,
    refetch: query.refetch,
  };
}

export default useGetProduct;
