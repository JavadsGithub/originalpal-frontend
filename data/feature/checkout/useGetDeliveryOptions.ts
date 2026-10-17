import { useQuery } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import { cartKeys } from "@/data/query-keys";
import type { DeliveryOption } from "@/lib/types/order";

/**
 * `GET /api/delivery/options?city=…` — the delivery table, in memory on the backend and keyed by city.
 *
 * Two behaviours the checkout form has to live with: the city match is **case-insensitive** but not
 * fuzzy, and an unsupported city is a `422 VALIDATION_ERROR field=city` rather than an empty list. So
 * the form loads options for whatever city the shopper typed and reports the 422 as "we do not deliver
 * there yet", which is exactly what checkout would say a step later.
 *
 * `delivery_method` from these rows is what `POST /api/checkouts/` expects back.
 */
export function useGetDeliveryOptions(city: string) {
  const trimmed = city.trim();
  const query = useQuery<DeliveryOption[]>({
    queryKey: cartKeys.deliveries(trimmed),
    enabled: trimmed.length > 0,
    queryFn: () =>
      customFetcher<DeliveryOption[]>({
        url: "/delivery/options",
        method: "GET",
        params: { city: trimmed },
      }),
  });

  return {
    options: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? toApiError(query.error) : null,
    /** True when the city answered `422` — the delivery table has no row for it. */
    isUnsupportedCity: Boolean(query.error && toApiError(query.error).message),
    refetch: () => void query.refetch(),
  };
}

export default useGetDeliveryOptions;
