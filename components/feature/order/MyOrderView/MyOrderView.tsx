"use client";

import { useState } from "react";
import useGetMyOrder from "@/data/feature/order/useGetMyOrder";
import useCancelMyOrder from "@/data/feature/order/useCancelMyOrder";
import PaymentPanel from "@/components/feature/order/PaymentPanel/PaymentPanel";
import OrderViewUI from "@/components/feature/order/OrderView/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getGuestOrderToken } from "@/lib/cart-storage";
import { canOwnerCancel } from "@/lib/order-rules";
import type { Order } from "@/lib/types/order";
import Link from "next/link";

/**
 * Tier 2 injector for a signed-in customer's own order (`/account/orders/{id}`).
 *
 * Cancelling is the customer's one action, and the API allows it **only while the order is
 * `awaiting_payment`** — a paid order is the shop's to cancel and refund. While the order is still
 * awaiting payment the payment panel is shown too: it needs the order's **guest token**, which this
 * browser kept from checkout, so a customer can finish paying even before the order is claimed to their
 * account.
 */
export default function MyOrderView({ orderId }: { orderId: string }) {
  const { order: fetched, isLoading, error, refetch } = useGetMyOrder(orderId);
  const [override, setOverride] = useState<Order | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const cancel = useCancelMyOrder();
  const order = override ?? fetched;

  if (isLoading && !order) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="my-order-loading">
        Loading the order...
      </p>
    );
  }

  if (!order) {
    return (
      <div className="space-y-3 text-sm" data-testid="my-order-not-found">
        <p className="text-muted-foreground">{error?.message ?? "This order is not on your account."}</p>
        <p className="text-xs text-muted-foreground">
          Orders are not attached to accounts automatically — a guest order has to be claimed with its
          access token first.
        </p>
        <div className="flex gap-3">
          <Link href="/account/orders" className="font-semibold text-foreground hover:underline">
            All my orders →
          </Link>
          <Link href="/orders/lookup" className="font-semibold text-foreground hover:underline">
            Claim a guest order →
          </Link>
        </div>
        <button type="button" className="block underline" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <OrderViewUI
        order={order}
        actions={
          order.status === "awaiting_payment" ? (
            <PaymentPanel
              order={order}
              guestToken={getGuestOrderToken(order.id)}
              onOrderUpdated={(updated) => setOverride(updated)}
            />
          ) : undefined
        }
      />

      {canOwnerCancel(order) && (
        <section className="space-y-2 rounded-lg border border-border p-4" data-testid="my-order-cancel">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Cancel this order</h2>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="my-order-cancel-reason">Reason</Label>
              <Input
                id="my-order-cancel-reason"
                data-testid="my-order-cancel-reason"
                className="w-64"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cancel.isPending || !reason.trim()}
              onClick={() => {
                setActionError(null);
                cancel.mutate(
                  { orderId: order.id, reason: reason.trim() },
                  {
                    onSuccess: (updated) => {
                      setOverride(updated);
                      setReason("");
                    },
                    onError: (mutationError) => setActionError(mutationError.message),
                  },
                );
              }}
            >
              {cancel.isPending ? "Cancelling..." : "Cancel the order"}
            </Button>
          </div>
          {actionError && (
            <p className="text-sm text-destructive" data-testid="my-order-cancel-error">
              {actionError}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
