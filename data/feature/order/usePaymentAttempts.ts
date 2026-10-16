import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import { orderKeys } from "@/data/query-keys";
import type {
  PaymentAttempt,
  PaymentAttemptList,
  PaymentVerification,
  PaymentVerificationRequest,
} from "@/lib/types/order";

/**
 * The mock payment flow, in the three calls the backend exposes.
 *
 * `POST /api/orders/{order_id}/payment-attempts/` mints an attempt (idempotent: a second call returns
 * the pending one) and hands back a `checkout_url` on `payments.example`, a provider that does not
 * exist. The **provider's callback** is `POST /api/payment-attempts/{attempt_id}/verify`, which takes
 * the amount and an outcome — and that is the only call that turns the order into `paid` (committing
 * the reserved stock) or records a failure.
 *
 * Because the provider is a mock, the storefront has to play the callback itself; every screen that
 * does so says as much, so nobody mistakes it for a real PSP integration.
 */
export function useGetPaymentAttempts(orderId: string | null, guestToken: string | null) {
  const query = useQuery<PaymentAttemptList>({
    queryKey: [...orderKeys.payments(orderId ?? "none"), guestToken ? "with-token" : "no-token"],
    enabled: Boolean(orderId && guestToken),
    queryFn: () =>
      customFetcher<PaymentAttemptList>({
        url: `/orders/${orderId}/payment-attempts/`,
        method: "GET",
        params: { guest_access_token: guestToken },
      }),
  });

  return {
    attempts: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error ? toApiError(query.error) : null,
  };
}

export function useStartPaymentAttempt(options?: { onSuccess?: (attempt: PaymentAttempt) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<PaymentAttempt, ApiError, { orderId: string; guestToken: string }>({
    mutationFn: ({ orderId, guestToken }) =>
      customFetcher<PaymentAttempt>({
        url: `/orders/${orderId}/payment-attempts/`,
        method: "POST",
        data: { guest_access_token: guestToken },
      }),
    onSuccess: (attempt) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.payments(attempt.order_id) });
      options?.onSuccess?.(attempt);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export function useVerifyPaymentAttempt(options?: {
  onSuccess?: (verification: PaymentVerification) => void;
  onError?: (error: ApiError) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<PaymentVerification, ApiError, { attemptId: string } & PaymentVerificationRequest>({
    mutationFn: ({ attemptId, ...payload }) =>
      customFetcher<PaymentVerification>({
        url: `/payment-attempts/${attemptId}/verify`,
        method: "POST",
        data: payload,
      }),
    onSuccess: (verification) => {
      queryClient.setQueryData(orderKeys.guest(verification.order.id), verification.order);
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      options?.onSuccess?.(verification);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}
