import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AdminOrderDetailUI, { type AdminOrderDetailCallbacks } from "./index";
import {
  cancelledPaidOrderFixture,
  orderFixture,
  paidOrderFixture,
} from "@/tests/fixtures";

function callbacks(overrides: Partial<AdminOrderDetailCallbacks> = {}): AdminOrderDetailCallbacks {
  return {
    onProcessing: vi.fn(),
    onShip: vi.fn(),
    onDeliver: vi.fn(),
    onCancel: vi.fn(),
    onRefund: vi.fn(),
    onCancelReasonChange: vi.fn(),
    onCarrierChange: vi.fn(),
    onTrackingChange: vi.fn(),
    onRefundReferenceChange: vi.fn(),
    ...overrides,
  };
}

const permissions = { canFulfill: true, canCancel: true, canRefund: true };
const form = { carrier: "PostNL", tracking: "TRK-1", cancelReason: "customer asked", refundReference: "RF-1" };

describe("AdminOrderDetailUI", () => {
  it("offers the transitions the status allows and no others", () => {
    render(
      <AdminOrderDetailUI order={paidOrderFixture} permissions={permissions} busy={false} form={form} callbacks={callbacks()} />,
    );

    // paid → process, ship or cancel; delivering is refused ("Only shipped orders can be delivered").
    expect(screen.getByRole("button", { name: "Mark processing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark shipped" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel the order" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark delivered" })).not.toBeInTheDocument();
  });

  it("warns that cancelling a paid order means a refund, and asks for the reason", () => {
    const handlers = callbacks();
    render(
      <AdminOrderDetailUI order={paidOrderFixture} permissions={permissions} busy={false} form={form} callbacks={handlers} />,
    );

    expect(screen.getByTestId("cancel-refund-warning")).toHaveTextContent("flag it as needing a refund");
    fireEvent.click(screen.getByRole("button", { name: "Cancel the order" }));
    expect(handlers.onCancel).toHaveBeenCalledWith("customer asked");
  });

  it("offers the refund field only once the order is cancelled and paid", () => {
    const { rerender } = render(
      <AdminOrderDetailUI order={cancelledPaidOrderFixture} permissions={permissions} busy={false} form={form} callbacks={callbacks()} />,
    );
    expect(screen.getByRole("button", { name: "Record the refund" })).toBeInTheDocument();

    // A cancelled order that was never paid needs no refund — the API refuses it.
    rerender(
      <AdminOrderDetailUI
        order={{ ...cancelledPaidOrderFixture, refund_required: false }}
        permissions={permissions}
        busy={false}
        form={form}
        callbacks={callbacks()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Record the refund" })).not.toBeInTheDocument();
  });

  it("shows nothing actionable when the order is delivered or the session lacks the permission", () => {
    const { rerender } = render(
      <AdminOrderDetailUI
        order={{ ...paidOrderFixture, status: "delivered" }}
        permissions={permissions}
        busy={false}
        form={form}
        callbacks={callbacks()}
      />,
    );
    expect(screen.getByText(/No action is available/)).toBeInTheDocument();

    // A read-only operator: the screen still renders the order, just without buttons.
    rerender(
      <AdminOrderDetailUI
        order={paidOrderFixture}
        permissions={{ canFulfill: false, canCancel: false, canRefund: false }}
        busy={false}
        form={form}
        callbacks={callbacks()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Mark processing" })).not.toBeInTheDocument();
    expect(screen.getByTestId("order-view")).toBeInTheDocument();
  });

  it("sends the carrier and tracking reference with the shipment", () => {
    const handlers = callbacks();
    render(
      <AdminOrderDetailUI
        order={{ ...orderFixture, status: "processing" }}
        permissions={permissions}
        busy={false}
        form={form}
        callbacks={handlers}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mark shipped" }));
    expect(handlers.onShip).toHaveBeenCalledWith("PostNL", "TRK-1");
  });
});
