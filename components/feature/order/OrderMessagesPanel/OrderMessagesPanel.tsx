"use client";

import useGetOrderMessages from "@/data/feature/order/useGetOrderMessages";
import useRetryOrderMessage from "@/data/feature/order/useRetryOrderMessage";
import OrderMessagesPanelUI from "./index";

/**
 * Tier 2 injector: reads the order's notifications and offers a retry for the failed ones.
 *
 * `canRetry` comes from the parent because the two calls need different permissions: listing the log
 * takes `orders:read`, retrying a delivery takes `orders:fulfill`.
 */
export default function OrderMessagesPanel({ orderId, canRetry }: { orderId: string; canRetry: boolean }) {
  const { messages, error } = useGetOrderMessages(orderId);
  const retry = useRetryOrderMessage();

  return (
    <OrderMessagesPanelUI
      canRetry={canRetry}
      messages={messages}
      busy={retry.isPending}
      errorMessage={error?.message ?? retry.error?.message ?? null}
      callbacks={{
        onRetry: (messageId) => retry.mutate({ orderId, messageId }),
      }}
    />
  );
}
