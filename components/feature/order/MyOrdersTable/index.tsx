"use client";

import OrderStatusBadge from "@/components/feature/order/OrderStatusBadge/index";
import { Button } from "@/components/ui/button";
import { formatPriceCents } from "@/lib/types/catalog";
import type { Order } from "@/lib/types/order";
import Link from "next/link";

export interface MyOrdersTableTranslations {
  heading: string;
  emptyState: string;
  emptyHint: string;
  orderColumn: string;
  dateColumn: string;
  statusColumn: string;
  totalColumn: string;
  viewText: string;
  loadingState: string;
  totalLabel: string;
  pageLabel: string;
  previousButtonText: string;
  nextButtonText: string;
}

export interface MyOrdersTableCallbacks {
  onPageChange: (page: number) => void;
}

export interface MyOrdersTableUIProps {
  orders: Order[];
  total: number;
  page: number;
  pages: number;
  translations?: Partial<MyOrdersTableTranslations>;
  callbacks: MyOrdersTableCallbacks;
}

const defaultTranslations: MyOrdersTableTranslations = {
  heading: "Your orders",
  emptyState: "No orders on this account yet.",
  emptyHint:
    "Checkout does not attach an order to an account — an order made while signed in has to be claimed with its access token before it shows up here.",
  orderColumn: "Order",
  dateColumn: "Placed",
  statusColumn: "Status",
  totalColumn: "Total",
  viewText: "View",
  loadingState: "Loading orders...",
  totalLabel: "orders",
  pageLabel: "Page",
  previousButtonText: "Previous",
  nextButtonText: "Next",
};

/**
 * Tier 1 list of the signed-in customer's orders.
 *
 * The empty state carries the point of the whole endpoint: orders are **claimed**, not collected, so a
 * customer who checked out before signing in (or while signed in) still has to associate the order
 * before it appears. The link to the claim form is what makes that discoverable.
 */
export default function MyOrdersTableUI({
  orders,
  total,
  page,
  pages,
  translations = {},
  callbacks,
}: MyOrdersTableUIProps) {
  const t = { ...defaultTranslations, ...translations };

  return (
    <section className="space-y-4" data-testid="my-orders">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.heading}</h1>
        <span className="text-xs text-muted-foreground" data-testid="my-orders-total">
          {total} {t.totalLabel}
        </span>
      </header>

      {orders.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground" data-testid="my-orders-empty">
            {t.emptyState}
          </p>
          <p className="mx-auto max-w-xl text-xs text-muted-foreground">{t.emptyHint}</p>
          <Link href="/orders/lookup" className="text-sm font-semibold text-foreground hover:underline">
            Claim a guest order →
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border" data-testid="my-orders-list">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="space-y-0.5">
                <p className="font-mono text-xs text-muted-foreground">{order.id.slice(0, 8)}</p>
                <p className="text-sm text-foreground">
                  {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                  {formatPriceCents(order.total_cents)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={order.status} refundRequired={order.refund_required} />
                <Link
                  href={`/account/orders/${order.id}`}
                  className="text-xs font-semibold text-foreground hover:underline"
                >
                  {t.viewText} →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t.pageLabel} {page} / {pages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => callbacks.onPageChange(page - 1)}
          >
            {t.previousButtonText}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pages}
            onClick={() => callbacks.onPageChange(page + 1)}
          >
            {t.nextButtonText}
          </Button>
        </div>
      )}
    </section>
  );
}
