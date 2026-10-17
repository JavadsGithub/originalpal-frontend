import { useQuery } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import { cartKeys } from "@/data/query-keys";
import type { Cart } from "@/lib/types/order";

/**
 * `GET /api/carts/{cart_id}` — the guest cart, addressed by the id this browser stored.
 *
 * There is no "my cart" endpoint: a cart has no owner, so the id **is** the capability. An unknown id
 * answers `404 RESOURCE_NOT_FOUND`, which is a normal state (a cleared browser, an expired cleanup),
 * so the screen treats it as "start a new cart" instead of an error.
 */
export function useGetCart(cartId: string | null) {
  const query = useQuery<Cart>({
    queryKey: cartKeys.detail(cartId),
    enabled: Boolean(cartId),
    queryFn: () => customFetcher<Cart>({ url: `/carts/${cartId}`, method: "GET" }),
  });

  return {
    cart: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? toApiError(query.error) : null,
    refetch: () => void query.refetch(),
  };
}

export default useGetCart;
