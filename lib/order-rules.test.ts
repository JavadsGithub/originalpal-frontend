import { describe, expect, it } from "vitest";
import {
  canCancel,
  canCheckout,
  canDeliver,
  canMarkProcessing,
  canOwnerCancel,
  canRecordRefund,
  canShip,
  canStartPayment,
  cartLineProblem,
  formatLineTotal,
  formatOrderTotal,
  hasCheckoutErrors,
  orderStatusHint,
  paymentWindowRemainingMs,
  validateCheckoutForm,
  willRefundOnCancel,
} from "./order-rules";
import {
  cancelledPaidOrderFixture,
  cartFixture,
  orderFixture,
  paidOrderFixture,
} from "@/tests/fixtures";

describe("order-rules — the status machine", () => {
  const byStatus = (status: (typeof paidOrderFixture)["status"]) => ({ ...paidOrderFixture, status });

  it("only lets a paid order be processed", () => {
    expect(canMarkProcessing(byStatus("paid"))).toBe(true);
    expect(canMarkProcessing(byStatus("awaiting_payment"))).toBe(false);
    expect(canMarkProcessing(byStatus("processing"))).toBe(false);
    expect(canMarkProcessing(byStatus("shipped"))).toBe(false);
  });

  it("ships from paid or processing, and delivers only from shipped", () => {
    // The entity accepts `paid | processing`, so the back office may skip the packing step.
    expect(canShip(byStatus("paid"))).toBe(true);
    expect(canShip(byStatus("processing"))).toBe(true);
    expect(canShip(byStatus("shipped"))).toBe(false);

    expect(canDeliver(byStatus("shipped"))).toBe(true);
    expect(canDeliver(byStatus("paid"))).toBe(false);
  });

  it("cancels anything that has not been dispatched, and flags paid ones for a refund", () => {
    expect(canCancel(byStatus("awaiting_payment"))).toBe(true);
    expect(canCancel(byStatus("paid"))).toBe(true);
    expect(canCancel(byStatus("processing"))).toBe(true);
    // "Dispatched orders cannot be cancelled" — 422 field=status.
    expect(canCancel(byStatus("shipped"))).toBe(false);
    expect(canCancel(byStatus("delivered"))).toBe(false);
    expect(canCancel(byStatus("cancelled"))).toBe(false);

    expect(willRefundOnCancel(byStatus("paid"))).toBe(true);
    expect(willRefundOnCancel(byStatus("awaiting_payment"))).toBe(false);
  });

  it("lets the owner cancel only while the order is unpaid — narrower than the back office", () => {
    // "Only unpaid orders can be cancelled by their owner" (422 field=status) covers both the customer
    // endpoint and `guest-cancel`, so a paid order is not the shopper's to cancel at all.
    expect(canOwnerCancel(byStatus("awaiting_payment"))).toBe(true);
    expect(canOwnerCancel(byStatus("paid"))).toBe(false);
    expect(canOwnerCancel(byStatus("processing"))).toBe(false);
    expect(canOwnerCancel(byStatus("shipped"))).toBe(false);
    expect(canOwnerCancel(byStatus("cancelled"))).toBe(false);
    // …whereas the back office may cancel a paid one — and then owes a refund.
    expect(canCancel(byStatus("paid"))).toBe(true);
    expect(willRefundOnCancel(byStatus("paid"))).toBe(true);
  });

  it("records a refund only for a cancelled order that was paid and has no reference yet", () => {
    expect(canRecordRefund(cancelledPaidOrderFixture)).toBe(true);
    expect(canRecordRefund({ ...cancelledPaidOrderFixture, refund_reference: "RF-1" })).toBe(false);
    expect(canRecordRefund({ ...paidOrderFixture, status: "cancelled", refund_required: false })).toBe(false);
    expect(canRecordRefund(paidOrderFixture)).toBe(false);
  });

  it("starts a payment only inside the window, and never for a late-payment exception", () => {
    const now = new Date("2026-10-16T13:45:00Z");
    expect(canStartPayment(orderFixture, now)).toBe(true);
    // 14:11:30 is the live `payment_expires_at` (created_at + 30 min).
    expect(canStartPayment(orderFixture, new Date("2026-10-16T14:20:00Z"))).toBe(false);
    expect(canStartPayment(paidOrderFixture, now)).toBe(false);
    expect(canStartPayment({ ...orderFixture, payment_exception: true }, now)).toBe(false);
  });

  it("counts the payment window down to zero and explains each status", () => {
    // The window is created + 30 min; the live pair of timestamps differs by a few hundred
    // milliseconds because the entity computes them separately, so compare with a second of slack.
    const remaining = paymentWindowRemainingMs(orderFixture, new Date(orderFixture.created_at));
    expect(remaining).toBeGreaterThan(30 * 60 * 1000 - 1000);
    expect(remaining).toBeLessThanOrEqual(30 * 60 * 1000);
    expect(paymentWindowRemainingMs(orderFixture, new Date("2026-10-16T15:00:00Z"))).toBe(0);

    expect(orderStatusHint(orderFixture)).toContain("reserved");
    expect(orderStatusHint(paidOrderFixture)).toContain("committed");
    expect(orderStatusHint(cancelledPaidOrderFixture)).toContain("refund");
    expect(orderStatusHint({ ...cancelledPaidOrderFixture, refund_required: false })).toContain("nothing was charged");
    expect(orderStatusHint({ ...orderFixture, payment_exception: true })).toContain("exception");
  });
});

describe("order-rules — cart and totals", () => {
  it("gates checkout on an available, non-empty cart", () => {
    expect(canCheckout(cartFixture)).toBe(true);
    expect(canCheckout({ lines: [] })).toBe(false);
    expect(canCheckout(null)).toBe(false);
    expect(
      canCheckout({
        ...cartFixture,
        lines: [{ ...cartFixture.lines[0], is_available: false }],
      }),
    ).toBe(false);
  });

  it("names the problem with a line instead of a generic error", () => {
    expect(cartLineProblem({ is_available: false, available_stock: 0, quantity: 1 })).toBe("Sold out");
    expect(cartLineProblem({ is_available: true, available_stock: 1, quantity: 3 })).toBe("Only 1 left");
    expect(cartLineProblem({ is_available: true, available_stock: 5, quantity: 2 })).toBeNull();
  });

  it("shows the arithmetic behind both totals", () => {
    expect(formatLineTotal(cartFixture.lines[0])).toBe("2 × €25.99 = €51.98");
    expect(formatOrderTotal(orderFixture)).toBe("€51.98 + €10.00 delivery = €61.98");
  });
});

describe("order-rules — checkout validation", () => {
  const valid = {
    contactName: "Guest Buyer",
    contactEmail: "guest@example.com",
    contactPhone: "",
    city: "Tehran",
    addressLine1: "Somewhere 1",
    postalCode: "12345",
    deliveryMethod: "express",
  };

  it("accepts what the API accepts", () => {
    expect(hasCheckoutErrors(validateCheckoutForm(valid))).toBe(false);
  });

  it("mirrors the DTO's own rules", () => {
    // `CheckoutCreate` strips and rejects blank strings, and the entity re-checks the email pattern.
    expect(validateCheckoutForm({ ...valid, contactName: "  " }).contactName).toBe("Required");
    expect(validateCheckoutForm({ ...valid, contactEmail: "nope" }).contactEmail).toBe(
      "A valid email is required",
    );
    expect(validateCheckoutForm({ ...valid, city: "" }).city).toBe("Required");
    expect(validateCheckoutForm({ ...valid, postalCode: "" }).postalCode).toBe("Required");
    expect(validateCheckoutForm({ ...valid, deliveryMethod: "" }).deliveryMethod).toBe(
      "Pick a delivery method",
    );
    // A phone is optional and is normalised to null by the caller, not rejected here.
    expect(validateCheckoutForm({ ...valid, contactPhone: "" }).contactPhone).toBeUndefined();
  });
});
