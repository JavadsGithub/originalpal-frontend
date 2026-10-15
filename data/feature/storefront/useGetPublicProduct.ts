import { useQuery } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import type { PublicProductDetail } from "@/lib/types/storefront";
import { storefrontKeys } from "@/data/query-keys";

/**
 * `GET /api/catalog/products/{id}` — the public detail.
 *
 * Two things answer `404 RESOURCE_NOT_FOUND`, both of them normal states for a shopper following an
 * old link: a product that is not published (draft or archived) and a published one whose SKUs were
 * all deactivated afterwards.
 */
export function useGetPublicProduct(productId: string) {
  const query = useQuery<PublicProductDetail>({
    queryKey: storefrontKeys.products.detail(productId),
    enabled: Boolean(productId),
    queryFn: () =>
      customFetcher<PublicProductDetail>({
        url: `/catalog/products/${productId}`,
        method: "GET",
      }),
  });

  return {
    product: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? toApiError(query.error) : null,
    refetch: () => void query.refetch(),
  };
}

export default useGetPublicProduct;
