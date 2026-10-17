import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@/lib/api-error";
import { orderTransition } from "./_orderAction";
import type { Order, OrderRefundRequest } from "@/lib/types/order";

/**
 * `POST /api/orders/{order_id}/refund`
 *
 * **`orders:refund`** — records a refund reference against a cancelled, paid order. The order must already be `cancelled` with `refund_required` and no reference yet, otherwise `422 field=status`; a second, different reference is refused too.
 */
export function useRecordRefund(options?: { onSuccess?: (order: Order) => void; onError?: (error: ApiError) => void }) {
  const queryClient = useQueryClient();

  return useMutation<Order, ApiError, { orderId: string; data?: OrderRefundRequest }>({
    ...orderTransition(queryClient, "/refund", options),
  });
}

export default useRecordRefund;
