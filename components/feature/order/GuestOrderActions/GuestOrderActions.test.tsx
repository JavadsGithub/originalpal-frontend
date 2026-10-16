import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import GuestOrderActionsUI, { type GuestOrderActionsCallbacks } from "./index";
import { cancelledPaidOrderFixture, orderFixture, paidOrderFixture } from "@/tests/fixtures";

function callbacks(overrides: Partial<GuestOrderActionsCallbacks> = {}): GuestOrderActionsCallbacks {
  return { onCancel: vi.fn(), onReasonChange: vi.fn(), ...overrides };
}

describe("GuestOrderActionsUI", () => {
  it("lets a guest cancel an order that has not been dispatched", () => {
    const handlers = callbacks();
    render(
      <GuestOrderActionsUI order={orderFixture} busy={false} reason="changed my mind" callbacks={handlers} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel this order" }));
    expect(handlers.onCancel).toHaveBeenCalledWith("changed my mind");
  });

  it("refuses to offer a cancel once the order is paid — that is the shop's call", () => {
    // The API's own words: "Only unpaid orders can be cancelled by their owner" (422 field=status).
    render(<GuestOrderActionsUI order={paidOrderFixture} busy={false} reason="" callbacks={callbacks()} />);

    expect(screen.queryByRole("button", { name: "Cancel this order" })).not.toBeInTheDocument();
    expect(screen.getByTestId("guest-cancel-unavailable")).toBeInTheDocument();
  });

  it("stops offering the button once the order is cancelled or delivered", () => {
    const { rerender } = render(
      <GuestOrderActionsUI order={cancelledPaidOrderFixture} busy={false} reason="" callbacks={callbacks()} />,
    );
    expect(screen.getByTestId("guest-cancel-unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel this order" })).not.toBeInTheDocument();

    rerender(
      <GuestOrderActionsUI
        order={{ ...paidOrderFixture, status: "shipped" }}
        busy={false}
        reason=""
        callbacks={callbacks()}
      />,
    );
    expect(screen.getByTestId("guest-cancel-unavailable")).toBeInTheDocument();
  });

  it("surfaces the API's refusal verbatim", () => {
    render(
      <GuestOrderActionsUI
        order={paidOrderFixture}
        busy={false}
        reason=""
        errorMessage="Shipped orders cannot be cancelled"
        callbacks={callbacks()}
      />,
    );

    expect(screen.getByTestId("guest-cancel-error")).toHaveTextContent("Shipped orders cannot be cancelled");
  });
});
