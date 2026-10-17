/**
 * Order-side wire types — field-for-field copies of the backend DTOs
 * (`app/interface/dto/{cart,order,payment,order_message,delivery_option}_dto.py`), confirmed against
 * live responses (`docs/integration/contract-audit.md` §13).
 */

export type { PaginatedPayload, PageParams } from "./api";

/** `OrderStatus` — the six states `OrderEntity` can be in. */
export const ORDER_STATUSES = [
  "awaiting_payment",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** `PaymentAttemptStatus`. */
export const PAYMENT_ATTEMPT_STATUSES = ["pending", "failed", "cancelled", "succeeded"] as const;
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

/** `OrderMessageKind` — the two notifications the backend dispatches itself. */
export type OrderMessageKind = "order_confirmation" | "dispatch_notice";
export type OrderMessageStatus = "pending" | "sent" | "failed";

/** `CartLine` — the API resolves `unit_price_cents` and the availability flags server-side. */
export interface CartLine {
  id: string;
  sku_id: string;
  quantity: number;
  /** Price at the time the line was written — the cart does not re-price itself. */
  unit_price_cents: number;
  line_price_cents: number;
  /** `available_stock >= quantity` **and** the SKU is still live, as of the last read. */
  is_available: boolean;
  available_stock: number;
  created_at: string;
  updated_at: string;
}

/**
 * `Cart` — the response of every cart endpoint.
 *
 * A cart has **no owner**: `POST /api/carts/` needs no session and the id is the only capability, so
 * the client stores it locally (see `lib/cart-storage.ts`). Line prices are fixed when the line is
 * written, so a cart can hold a stale price until it is re-added.
 */
export interface Cart {
  id: string;
  lines: CartLine[];
  total_price_cents: number;
  created_at: string;
  updated_at: string;
}

export interface CartLineCreateRequest {
  sku_id: string;
  quantity: number;
}

export interface CartLineUpdateRequest {
  quantity: number;
}

/** `DeliveryOption` — the delivery table is in-memory on the backend, keyed by city + method. */
export interface DeliveryOption {
  id: string;
  city: string;
  /** `standard` | `express` — the string that must be sent back as `delivery_method`. */
  method: string;
  label: string;
  fee_cents: number;
}

/** `CheckoutCreate` — every field is required except `contact_phone`, and `delivery_method` must exist. */
export interface CheckoutCreateRequest {
  cart_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string | null;
  city: string;
  address_line1: string;
  postal_code: string;
  /** Defaults to `standard` on the backend; an unsupported combination is a `422 field=delivery_method`. */
  delivery_method?: string;
}

/** `OrderItem` — a frozen copy of the SKU at checkout time (title, options and price included). */
export interface OrderItem {
  id: string;
  sku_id: string;
  sku_code: string;
  product_id: string;
  product_title: string;
  option_values: Record<string, string>;
  quantity: number;
  unit_price_cents: number;
  line_price_cents: number;
  created_at: string;
}

/**
 * `Order`.
 *
 * `guest_access_token` is part of the payload because it is the order's *only* capability: the public
 * `GET /api/orders/{id}` and every payment call require it, and a signed-in customer cannot read even
 * their own order until they associate it (see `OrderAssociation`).
 */
export interface Order {
  id: string;
  cart_id: string;
  guest_access_token: string;
  /** Set only once the order is associated with an account, or made while signed in **and** confirmed. */
  customer_id: string | null;
  status: OrderStatus;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  city: string;
  address_line1: string;
  postal_code: string;
  delivery_method: string;
  delivery_fee_cents: number;
  carrier: string | null;
  tracking_reference: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  /** True when a **paid** order was cancelled — an operator still has to send the money back. */
  refund_required: boolean;
  refund_reference: string | null;
  refunded_at: string | null;
  /** The payment window (`created_at + 30 min`); past it the order cancels itself on the next call. */
  payment_expires_at: string;
  /** A payment that arrived after the window expired — recorded, but the order stays cancelled. */
  payment_exception: boolean;
  payment_exception_reason: string | null;
  payment_exception_reference: string | null;
  items: OrderItem[];
  subtotal_cents: number;
  total_cents: number;
  created_at: string;
  updated_at: string;
}

export interface OrderCancelRequest {
  reason: string;
}

export interface OrderShipRequest {
  carrier: string;
  tracking_reference: string;
}

export interface OrderRefundRequest {
  refund_reference: string;
}

/** `PaymentAttempt` — `checkout_url` points at the mock provider, which is why the UI simulates the callback. */
export interface PaymentAttempt {
  id: string;
  order_id: string;
  provider: string;
  amount_cents: number;
  checkout_url: string;
  provider_reference: string | null;
  status: PaymentAttemptStatus;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAttemptList {
  items: PaymentAttempt[];
  total: number;
}

export type PaymentOutcome = "succeeded" | "failed" | "cancelled" | "pending";

/** `PaymentVerificationCreate` — this is the provider's callback, not a customer action. */
export interface PaymentVerificationRequest {
  order_id: string;
  /** Must equal the attempt's amount, otherwise `422 field=amount_cents`. */
  amount_cents: number;
  outcome: PaymentOutcome;
  provider_reference?: string | null;
  failure_reason?: string | null;
}

export interface PaymentVerification {
  attempt: PaymentAttempt;
  order: Order;
}

/** `OrderMessage` — outbound notifications with a retry endpoint. */
export interface OrderMessage {
  id: string;
  order_id: string;
  kind: OrderMessageKind;
  channel: string;
  recipient: string;
  subject: string;
  body: string;
  status: OrderMessageStatus;
  attempt_count: number;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

/** `GuestOrderAssociation` — the request returns the token because there is no outbound email yet. */
export interface GuestOrderAssociation {
  accepted: boolean;
  verification_token: string | null;
  expires_at: string | null;
}
