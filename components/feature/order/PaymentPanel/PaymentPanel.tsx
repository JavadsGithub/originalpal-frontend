"use client";

import { useEffect, useState } from "react";
import {
  useGetPaymentAttempts,
  useStartPaymentAttempt,
  useVerifyPaymentAttempt,
} from "@/data/feature/order/usePaymentAttempts";
import { paymentWindowRemainingMs } from "@/lib/order-rules";
import type { Order, PaymentOutcome } from "@/lib/types/order";
import PaymentPanelUI from "./index";

export interface PaymentPanelProps {
  order: Order;
  /** The order's guest access token — the payment endpoints are all keyed by it. */
  guestToken: string | null;
  /** Called after a verification, so the host screen can prefer the fresher order it received. */
  onOrderUpdated?: (order: Order) => void;
}

/**
 * Tier 2 injector for the payment panel.
 *
 * It owns the payment window countdown (a one-second tick that only runs while the order is waiting for
 * money) and the three API calls. `verify` sends the attempt's **own amount**, because the API compares
 * it against the attempt and rejects a mismatch with `422 field=amount_cents` — the provider would know
 * the amount, so the UI takes it from the attempt rather than recomputing it.
 */
export default function PaymentPanel({ order, guestToken, onOrderUpdated }: PaymentPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const { attempts } = useGetPaymentAttempts(order.id, guestToken);
  const start = useStartPaymentAttempt();
  const verify = useVerifyPaymentAttempt();

  const awaiting = order.status === "awaiting_payment" && !order.payment_exception;

  useEffect(() => {
    if (!awaiting) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [awaiting]);

  const pending = attempts.find((attempt) => attempt.status === "pending") ?? null;

  return (
    <PaymentPanelUI
      order={order}
      attempts={attempts}
      remainingMs={paymentWindowRemainingMs(order, now)}
      busy={start.isPending || verify.isPending}
      errorMessage={error}
      callbacks={{
        onStart: () => {
          setError(null);
          if (!guestToken) {
            setError("This order has no access token in this browser, so it cannot be paid from here.");
            return;
          }
          start.mutate(
            { orderId: order.id, guestToken },
            { onError: (mutationError) => setError(mutationError.message) },
          );
        },
        onVerify: (outcome: PaymentOutcome) => {
          setError(null);
          if (!pending) return;
          verify.mutate(
            {
              attemptId: pending.id,
              order_id: order.id,
              amount_cents: pending.amount_cents,
              outcome,
              provider_reference: outcome === "succeeded" ? `MOCK-${pending.id.slice(0, 8)}` : null,
              failure_reason: outcome === "failed" ? "Declined by the mock provider" : null,
            },
            {
              onSuccess: (verification) => onOrderUpdated?.(verification.order),
              onError: (mutationError) => setError(mutationError.message),
            },
          );
        },
      }}
    />
  );
}
