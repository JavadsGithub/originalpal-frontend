"use client";

import { useState } from "react";
import useCancelGuestOrder from "@/data/feature/order/useCancelGuestOrder";
import { ORDER_STATUS_LABELS } from "@/lib/order-rules";
import type { Order } from "@/lib/types/order";
import GuestOrderActionsUI from "./index";

export interface GuestOrderActionsProps {
  order: Order;
  guestToken: string;
  /** Lets the page fold the cancelled order back into what it renders. */
  onOrderUpdated?: (order: Order) => void;
}

/**
 * Tier 2 injector for the guest's own cancel button.
 *
 * The mutation answers with the whole order, so the page is handed the new version directly instead of
 * waiting for a refetch — a guest who just cancelled should see `cancelled` immediately.
 */
export default function GuestOrderActions({ order, guestToken, onOrderUpdated }: GuestOrderActionsProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const cancel = useCancelGuestOrder({
    onSuccess: (updated) => {
      setError(null);
      setSuccess(`Your order is now “${ORDER_STATUS_LABELS[updated.status]}”.`);
      setReason("");
      onOrderUpdated?.(updated);
    },
    onError: (mutationError) => {
      setSuccess(null);
      setError(mutationError.message);
    },
  });

  return (
    <GuestOrderActionsUI
      order={order}
      busy={cancel.isPending}
      reason={reason}
      errorMessage={error}
      successMessage={success}
      callbacks={{
        onCancel: (value) => cancel.mutate({ orderId: order.id, guestAccessToken: guestToken, reason: value }),
        onReasonChange: setReason,
      }}
    />
  );
}
