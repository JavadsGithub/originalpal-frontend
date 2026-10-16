"use client";

import { useState } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import useGetAdminOrder from "@/data/feature/order/useGetAdminOrder";
import useMarkOrderProcessing from "@/data/feature/order/useMarkOrderProcessing";
import useShipOrder from "@/data/feature/order/useShipOrder";
import useDeliverOrder from "@/data/feature/order/useDeliverOrder";
import useCancelOrder from "@/data/feature/order/useCancelOrder";
import useRecordRefund from "@/data/feature/order/useRecordRefund";
import OrderMessagesPanel from "@/components/feature/order/OrderMessagesPanel/OrderMessagesPanel";
import OrderStatusBadge from "@/components/feature/order/OrderStatusBadge/index";
import { ORDER_STATUS_LABELS } from "@/lib/order-rules";
import type { Order } from "@/lib/types/order";
import Link from "next/link";
import AdminOrderDetailUI from "./index";

/** One form object for the three actions that take input, so the panel stays a pure component. */
const EMPTY_FORM = { carrier: "", tracking: "", cancelReason: "", refundReference: "" };

/**
 * Tier 2 injector for the back-office order detail.
 *
 * Every transition answers with the whole order, which replaces the cache entry — the status pill and the
 * available actions therefore change the moment the API agrees. Permissions are resolved once here
 * (`orders:fulfill` for the three fulfilment steps, `orders:cancel`, `orders:refund`) and passed down as
 * plain booleans, so the UI has no opinion about the session.
 */
export default function AdminOrderDetail({ orderId }: { orderId: string }) {
  const { hasPermission, isSuperUser } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { order, isLoading, error: readError, refetch } = useGetAdminOrder(orderId);

  const onSuccess = (updated: Order) => {
    setError(null);
    setSuccess(`Order is now “${ORDER_STATUS_LABELS[updated.status]}”.`);
    setForm(EMPTY_FORM);
  };
  const onError = (mutationError: { message: string }) => {
    setSuccess(null);
    setError(mutationError.message);
  };

  const processing = useMarkOrderProcessing({ onSuccess, onError });
  const ship = useShipOrder({ onSuccess, onError });
  const deliver = useDeliverOrder({ onSuccess, onError });
  const cancel = useCancelOrder({ onSuccess, onError });
  const refund = useRecordRefund({ onSuccess, onError });

  const busy =
    processing.isPending || ship.isPending || deliver.isPending || cancel.isPending || refund.isPending;

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="admin-order-loading">
        Loading the order...
      </p>
    );
  }

  if (!order) {
    return (
      <div className="space-y-3 text-sm" data-testid="admin-order-error">
        <p className="text-destructive">{readError?.message ?? "Could not load the order"}</p>
        <Link href="/admin/orders" className="font-semibold text-foreground hover:underline">
          Back to the order list →
        </Link>
        <button type="button" className="block underline" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  const permissions = {
    canFulfill: isSuperUser || hasPermission(Permissions.Orders_Fulfill),
    canCancel: isSuperUser || hasPermission(Permissions.Orders_Cancel),
    canRefund: isSuperUser || hasPermission(Permissions.Orders_Refund),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/orders" className="text-xs text-muted-foreground hover:underline">
          ← All orders
        </Link>
        <OrderStatusBadge status={order.status} refundRequired={order.refund_required} />
      </div>

      <AdminOrderDetailUI
        order={order}
        permissions={permissions}
        busy={busy}
        form={form}
        errorMessage={error}
        successMessage={success}
        messages={
          <OrderMessagesPanel
            orderId={order.id}
            canRetry={isSuperUser || hasPermission(Permissions.Orders_Fulfill)}
          />
        }
        callbacks={{
          onProcessing: () => processing.mutate({ orderId: order.id }),
          onShip: (carrier, tracking) =>
            ship.mutate({
              orderId: order.id,
              data: { carrier: carrier.trim(), tracking_reference: tracking.trim() },
            }),
          onDeliver: () => deliver.mutate({ orderId: order.id }),
          onCancel: (reason) => cancel.mutate({ orderId: order.id, data: { reason: reason.trim() } }),
          onRefund: (reference) =>
            refund.mutate({ orderId: order.id, data: { refund_reference: reference.trim() } }),
          onCancelReasonChange: (cancelReason) => setForm((current) => ({ ...current, cancelReason })),
          onCarrierChange: (carrier) => setForm((current) => ({ ...current, carrier })),
          onTrackingChange: (tracking) => setForm((current) => ({ ...current, tracking })),
          onRefundReferenceChange: (refundReference) =>
            setForm((current) => ({ ...current, refundReference })),
        }}
      />
    </div>
  );
}
