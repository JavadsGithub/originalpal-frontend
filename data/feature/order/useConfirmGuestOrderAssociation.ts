import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import { orderKeys } from "@/data/query-keys";
import { forgetGuestOrderToken, rememberGuestOrderToken } from "@/lib/cart-storage";
import type { Order } from "@/lib/types/order";

/**
 * `POST /api/me/orders/guest-associations/confirm` — completes the claim started by the request step.
 *
 * A single-use `verification_token`, valid for an hour. On success the order belongs to the account and
 * its guest token is no longer the way in, so the stored one is dropped.
 */
export function useConfirmGuestOrderAssociation(options?: { onSuccess?: (order: Order) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<Order, ApiError, { verificationToken: string }>({
    mutationFn: ({ verificationToken }) =>
      customFetcher<Order>({
        url: "/me/orders/guest-associations/confirm",
        method: "POST",
        data: { verification_token: verificationToken },
      }),
    onSuccess: (order) => {
      forgetGuestOrderToken(order.id);
      rememberGuestOrderToken(order.id, order.guest_access_token);
      queryClient.setQueryData(orderKeys.mineDetail(order.id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      options?.onSuccess?.(order);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useConfirmGuestOrderAssociation;
