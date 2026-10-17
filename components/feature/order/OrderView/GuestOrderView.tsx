"use client";

import { useState } from "react";
import useGetGuestOrder from "@/data/feature/order/useGetGuestOrder";
import { getGuestOrderToken } from "@/lib/cart-storage";
import Link from "next/link";
import PaymentPanel from "@/components/feature/order/PaymentPanel/PaymentPanel";
import GuestOrderActions from "@/components/feature/order/GuestOrderActions/GuestOrderActions";
import OrderViewUI from "./index";

export interface GuestOrderViewProps {
  orderId: string;
  /** `?token=…`, when the link carried one (an emailed confirmation would). */
  tokenFromUrl?: string | null;
}

/**
 * Tier 2 injector for the public order page — the page a guest lands on after checkout.
 *
 * The token comes from the URL when a link provides one, otherwise from the browser's own store
 * (`lib/cart-storage.ts`), which is where checkout put it. Without either there is nothing to show and
 * the page says so: an order is exactly as private as its token, and the API answers `404` to anything
 * else.
 */
export default function GuestOrderView({ orderId, tokenFromUrl = null }: GuestOrderViewProps) {
  const [token] = useState(() => tokenFromUrl ?? getGuestOrderToken(orderId));
  const [override, setOverride] = useState<null | ReturnType<typeof useGetGuestOrder>["order"]>(null);

  const { order: fetched, isLoading, error, refetch } = useGetGuestOrder(orderId, token);
  const order = override ?? fetched;

  if (!token) {
    return (
      <div className="space-y-3 rounded-xl border border-border p-6 text-sm" data-testid="order-no-token">
        <h1 className="text-base font-semibold text-foreground">This order needs its access link</h1>
        <p className="text-muted-foreground">
          Guest orders are readable only with the access token the checkout created — there is no
          account behind them. This browser does not have one for{" "}
          <span className="font-mono">{orderId.slice(0, 8)}</span>.
        </p>
        <Link href="/orders/lookup" className="font-semibold hover:underline">
          Enter an access token →
        </Link>
      </div>
    );
  }

  if (isLoading && !order) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="order-loading">
        Loading the order...
      </p>
    );
  }

  if (!order) {
    return (
      <div className="space-y-3 rounded-xl border border-border p-6 text-sm" data-testid="order-not-found">
        <h1 className="text-base font-semibold text-foreground">Order not found</h1>
        <p className="text-muted-foreground">
          {error?.message ?? "The order does not exist, or this token is not the one it was created with."}
        </p>
        <button type="button" className="font-semibold hover:underline" onClick={refetch}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <OrderViewUI
      order={order}
      actions={
        <>
          <PaymentPanel order={order} guestToken={token} onOrderUpdated={(updated) => setOverride(updated)} />
          <GuestOrderActions
            order={order}
            guestToken={token}
            onOrderUpdated={(updated) => setOverride(updated)}
          />
        </>
      }
    />
  );
}
