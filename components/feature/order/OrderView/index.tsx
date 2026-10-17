"use client";

import OrderStatusBadge from "@/components/feature/order/OrderStatusBadge/index";
import { formatPriceCents } from "@/lib/types/catalog";
import { formatOrderTotal, orderStatusHint } from "@/lib/order-rules";
import type { Order } from "@/lib/types/order";

export interface OrderViewTranslations {
  itemsHeading: string;
  deliveryHeading: string;
  totalsHeading: string;
  paymentHeading: string;
  contactHeading: string;
  subtotalLabel: string;
  deliveryFeeLabel: string;
  totalLabel: string;
  placedLabel: string;
  trackingLabel: string;
  contactEmailLabel: string;
  contactPhoneLabel: string;
  cancelReasonLabel: string;
  refundReferenceLabel: string;
  paymentWindowLabel: string;
}

export interface OrderViewUIProps {
  order: Order;
  /** The payment panel (or any other action area) the caller wants under the summary. */
  actions?: React.ReactNode;
  translations?: Partial<OrderViewTranslations>;
}

const defaultTranslations: OrderViewTranslations = {
  itemsHeading: "Items",
  deliveryHeading: "Delivery",
  totalsHeading: "Totals",
  paymentHeading: "Payment",
  contactHeading: "Contact",
  subtotalLabel: "Subtotal",
  deliveryFeeLabel: "Delivery",
  totalLabel: "Total",
  placedLabel: "Placed",
  trackingLabel: "Tracking",
  contactEmailLabel: "Email",
  contactPhoneLabel: "Phone",
  cancelReasonLabel: "Cancellation reason",
  refundReferenceLabel: "Refund reference",
  paymentWindowLabel: "Payment window closes",
};

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

/**
 * Tier 1 order summary, shared by the guest confirmation page, the customer's order page and the
 * back-office detail — the three screens differ in what they can *do*, not in what is true.
 *
 * Everything rendered here comes straight off the order: item titles and prices are the values frozen
 * at checkout (the product may have changed since), and the status line is the API's own status plus
 * `orderStatusHint()`'s explanation of what it means for money and stock.
 */
export default function OrderViewUI({ order, actions, translations = {} }: OrderViewUIProps) {
  const t = { ...defaultTranslations, ...translations };

  return (
    <article className="space-y-6" data-testid="order-view">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Order <span className="font-mono text-sm">{order.id.slice(0, 8)}</span>
          </h1>
          <OrderStatusBadge status={order.status} refundRequired={order.refund_required} />
        </div>
        <p className="max-w-3xl text-xs text-muted-foreground" data-testid="order-status-hint">
          {orderStatusHint(order)}
        </p>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <div className="flex gap-1">
            <dt>{t.placedLabel}:</dt>
            <dd>{formatTimestamp(order.created_at)}</dd>
          </div>
          {order.status === "awaiting_payment" && !order.payment_exception && (
            <div className="flex gap-1">
              <dt>{t.paymentWindowLabel}:</dt>
              <dd data-testid="payment-window">{formatTimestamp(order.payment_expires_at)}</dd>
            </div>
          )}
          {order.tracking_reference && (
            <div className="flex gap-1">
              <dt>{t.trackingLabel}:</dt>
              <dd className="font-mono">
                {order.carrier} · {order.tracking_reference}
              </dd>
            </div>
          )}
          {order.cancellation_reason && (
            <div className="flex gap-1">
              <dt>{t.cancelReasonLabel}:</dt>
              <dd>{order.cancellation_reason}</dd>
            </div>
          )}
          {order.refund_reference && (
            <div className="flex gap-1">
              <dt>{t.refundReferenceLabel}:</dt>
              <dd className="font-mono">{order.refund_reference}</dd>
            </div>
          )}
        </dl>
      </header>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{t.itemsHeading}</h2>
        <ul className="divide-y divide-border rounded-lg border border-border" data-testid="order-items">
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-sm text-foreground">{item.product_title}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {item.sku_code}
                  {formatOptions(item.option_values) ? ` · ${formatOptions(item.option_values)}` : ""}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {item.quantity} × {formatPriceCents(item.unit_price_cents)} ={" "}
                <span className="text-foreground">{formatPriceCents(item.line_price_cents)}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{t.deliveryHeading}</h2>
          <address className="space-y-0.5 text-xs not-italic text-muted-foreground" data-testid="order-delivery">
            <p className="text-foreground">{order.contact_name}</p>
            <p>{order.address_line1}</p>
            <p>
              {order.postal_code} {order.city}
            </p>
            <p>{order.delivery_method}</p>
          </address>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{t.totalsHeading}</h2>
          <dl className="space-y-1 text-xs text-muted-foreground" data-testid="order-totals">
            <div className="flex justify-between gap-4">
              <dt>{t.subtotalLabel}</dt>
              <dd>{formatPriceCents(order.subtotal_cents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>{t.deliveryFeeLabel}</dt>
              <dd>{formatPriceCents(order.delivery_fee_cents)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-1 text-sm text-foreground">
              <dt>{t.totalLabel}</dt>
              <dd data-testid="order-total">{formatPriceCents(order.total_cents)}</dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">{formatOrderTotal(order)}</p>
        </section>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{t.contactHeading}</h2>
        <dl className="space-y-1 text-xs text-muted-foreground">
          <div className="flex gap-1">
            <dt>{t.contactEmailLabel}:</dt>
            <dd>{order.contact_email}</dd>
          </div>
          {order.contact_phone && (
            <div className="flex gap-1">
              <dt>{t.contactPhoneLabel}:</dt>
              <dd>{order.contact_phone}</dd>
            </div>
          )}
        </dl>
      </section>

      {actions && (
        <section className="space-y-3" data-testid="order-actions">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{t.paymentHeading}</h2>
          {actions}
        </section>
      )}
    </article>
  );
}

function formatOptions(optionValues: Record<string, string>): string {
  return Object.entries(optionValues)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" · ");
}
