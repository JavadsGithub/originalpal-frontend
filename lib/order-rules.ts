/**
 * Order-side rules.
 *
 * The status machine and the guards here are transcriptions of `OrderEntity`'s methods (audit §13) —
 * the API rejects an illegal transition with `422 field=status`, so the UI must not offer it in the
 * first place.
 */

import { formatPriceCents } from "./types/catalog";
import type { Cart, CartLine, Order, OrderStatus } from "./types/order";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Order statuses that mean "money has been taken". */
const PAID_STATUSES: OrderStatus[] = ["paid", "processing"];

export function isPaid(order: Pick<Order, "status">): boolean {
  return PAID_STATUSES.includes(order.status);
}

/** `mark_processing` accepts only `paid`. */
export function canMarkProcessing(order: Pick<Order, "status">): boolean {
  return order.status === "paid";
}

/** `mark_shipped` accepts `paid` or `processing` (the back office may skip the processing step). */
export function canShip(order: Pick<Order, "status">): boolean {
  return order.status === "paid" || order.status === "processing";
}

/** `mark_delivered` accepts only `shipped`. */
export function canDeliver(order: Pick<Order, "status">): boolean {
  return order.status === "shipped";
}

/**
 * Back-office `POST /api/orders/{id}/cancel` — the entity refuses `shipped`/`delivered`
 * (`422 field=status`) and returns early for an already-cancelled order. Cancelling a **paid** order
 * sets `refund_required`, which is what makes `record_refund` possible afterwards.
 */
export function canCancel(order: Pick<Order, "status">): boolean {
  return !["shipped", "delivered", "cancelled"].includes(order.status);
}

/**
 * Owner cancellation — `POST /api/orders/{id}/guest-cancel` and
 * `POST /api/me/orders/{id}/cancel` — is **narrower than the back office's**: the use case only
 * accepts an `awaiting_payment` order ("Only unpaid orders can be cancelled by their owner",
 * `422 field=status`). A shopper who has paid cannot cancel their own order; they have to ask the
 * shop, which is what the admin `cancel` + `refund` pair is for.
 */
export function canOwnerCancel(order: Pick<Order, "status">): boolean {
  return order.status === "awaiting_payment";
}

/** `record_refund` accepts only a cancelled order that was paid — i.e. `refund_required === true`. */
export function canRecordRefund(order: Pick<Order, "status" | "refund_required" | "refund_reference">): boolean {
  return order.status === "cancelled" && order.refund_required && order.refund_reference === null;
}

/**
 * Whether cancelling will flag the order for a refund. Only reachable through the **back office**
 * cancel: an owner (customer or guest) can cancel nothing but an unpaid order.
 */
export function willRefundOnCancel(order: Pick<Order, "status">): boolean {
  return isPaid(order);
}

/**
 * Starts a payment attempt. Allowed only while the order is `awaiting_payment` **and** inside the
 * window — past `payment_expires_at` the next call expires the order instead (it becomes `cancelled`
 * with the reason "payment window expired").
 */
export function canStartPayment(
  order: Pick<Order, "status" | "payment_expires_at" | "payment_exception">,
  now: Date = new Date(),
): boolean {
  if (order.payment_exception) return false;
  if (order.status !== "awaiting_payment") return false;
  return new Date(order.payment_expires_at).getTime() > now.getTime();
}

/** Milliseconds left in the payment window; `0` once it has passed. */
export function paymentWindowRemainingMs(order: Pick<Order, "payment_expires_at">, now: Date = new Date()): number {
  return Math.max(0, new Date(order.payment_expires_at).getTime() - now.getTime());
}

/** "14:32" — a countdown label for the payment window. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** A cart is checkout-able when it has at least one line and every line is available right now. */
export function canCheckout(cart: Pick<Cart, "lines"> | null): boolean {
  return Boolean(cart && cart.lines.length > 0 && cart.lines.every((line) => line.is_available));
}

export function cartLineProblem(line: Pick<CartLine, "is_available" | "available_stock" | "quantity">): string | null {
  if (!line.is_available) return "Sold out";
  if (line.available_stock < line.quantity) return `Only ${line.available_stock} left`;
  return null;
}

/** "€51.98 for 2 × €25.99" — the line total with its arithmetic shown. */
export function formatLineTotal(line: Pick<CartLine, "quantity" | "unit_price_cents" | "line_price_cents">): string {
  return `${line.quantity} × ${formatPriceCents(line.unit_price_cents)} = ${formatPriceCents(line.line_price_cents)}`;
}

export function formatOrderTotal(order: Pick<Order, "subtotal_cents" | "delivery_fee_cents" | "total_cents">): string {
  return `${formatPriceCents(order.subtotal_cents)} + ${formatPriceCents(order.delivery_fee_cents)} delivery = ${formatPriceCents(order.total_cents)}`;
}

/** One line of prose describing where the order stands and what happens next. */
export function orderStatusHint(order: Pick<Order, "status" | "refund_required" | "payment_exception" | "cancellation_reason">): string {
  if (order.payment_exception) {
    return "A payment arrived after the window expired. The order stays cancelled and the payment is recorded as an exception for a human to resolve.";
  }

  switch (order.status) {
    case "awaiting_payment":
      return "Stock is reserved for this order until the payment window closes; if it closes, the reservation is released and the order cancels itself.";
    case "paid":
      return "Payment confirmed and the stock is committed. The fulfilment team can start processing it.";
    case "processing":
      return "Being picked and packed.";
    case "shipped":
      return "Dispatched. A tracking reference is on the order.";
    case "delivered":
      return "Delivered.";
    case "cancelled":
      if (order.refund_required) {
        return order.cancellation_reason === "payment window expired"
          ? "Cancelled because the payment window expired; the reserved stock went back on the shelf."
          : "Cancelled after payment, so a refund has to be recorded by an operator.";
      }
      return "Cancelled before payment, so nothing was charged and no refund is needed.";
  }
}

/**
 * Guards the checkout form the same way `CheckoutCreate` + `OrderEntity.create` do: required strings,
 * an email pattern and a delivery method that must exist for the city.
 */
export interface CheckoutFormValues {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  addressLine1: string;
  postalCode: string;
  deliveryMethod: string;
}

export type CheckoutFormErrors = Partial<Record<keyof CheckoutFormValues, string>>;

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateCheckoutForm(values: CheckoutFormValues): CheckoutFormErrors {
  const errors: CheckoutFormErrors = {};

  if (!values.contactName.trim()) errors.contactName = "Required";
  if (!EMAIL_PATTERN.test(values.contactEmail.trim().toLowerCase())) errors.contactEmail = "A valid email is required";
  if (!values.city.trim()) errors.city = "Required";
  if (!values.addressLine1.trim()) errors.addressLine1 = "Required";
  if (!values.postalCode.trim()) errors.postalCode = "Required";
  if (!values.deliveryMethod.trim()) errors.deliveryMethod = "Pick a delivery method";

  return errors;
}

export function hasCheckoutErrors(errors: CheckoutFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
