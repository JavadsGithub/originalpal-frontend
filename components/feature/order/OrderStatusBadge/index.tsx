"use client";

import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_LABELS } from "@/lib/order-rules";
import type { OrderStatus } from "@/lib/types/order";

export interface OrderStatusBadgeProps {
  status: OrderStatus;
  /** The order's `refund_required` flag, when the caller has it — shown next to `cancelled`. */
  refundRequired?: boolean;
}

const VARIANTS: Record<OrderStatus, "success" | "outline" | "danger"> = {
  awaiting_payment: "outline",
  paid: "success",
  processing: "success",
  shipped: "success",
  delivered: "success",
  cancelled: "danger",
};

/** Tier 1 status pill — the six states the API can return, with no client-side guessing. */
export default function OrderStatusBadge({ status, refundRequired = false }: OrderStatusBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1" data-testid={`order-status-${status}`}>
      <Badge variant={VARIANTS[status]}>{ORDER_STATUS_LABELS[status]}</Badge>
      {refundRequired && <Badge variant="outline">Refund needed</Badge>}
    </span>
  );
}
