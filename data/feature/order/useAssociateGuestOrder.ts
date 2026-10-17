import { useMutation } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import type { GuestOrderAssociation } from "@/lib/types/order";

/**
 * Claiming a guest order, in the two steps the backend models:
 *
 * 1. `POST /api/me/orders/guest-associations/request` — proves the caller knows the order's guest token
 *    **and** that the order's contact email matches the signed-in account. It answers
 *    `{accepted, verification_token, expires_at}`; the token comes back in the payload because the
 *    backend has no outbound email yet (same situation as password recovery, follow-up #11).
 * 2. `POST /api/me/orders/guest-associations/confirm` — exchanges that token for the association and
 *    answers with the order, which is how `customer_id` becomes set and the order appears in
 *    `/account/orders`.
 *
 * An order belonging to someone else answers `404` at step 1, so the UI cannot probe for other
 * people's orders.
 */
export function useRequestGuestOrderAssociation(options?: {
  onSuccess?: (association: GuestOrderAssociation) => void;
  onError?: (error: ApiError) => void;
}) {
  return useMutation<GuestOrderAssociation, ApiError, { orderId: string; guestToken: string }>({
    mutationFn: ({ orderId, guestToken }) =>
      customFetcher<GuestOrderAssociation>({
        url: "/me/orders/guest-associations/request",
        method: "POST",
        data: { order_id: orderId, guest_access_token: guestToken },
      }),
    onSuccess: (association) => options?.onSuccess?.(association),
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useRequestGuestOrderAssociation;
