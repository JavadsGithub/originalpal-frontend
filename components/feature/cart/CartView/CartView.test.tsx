import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CartViewUI, { type CartViewCallbacks } from "./index";
import { cartFixture } from "@/tests/fixtures";

function callbacks(overrides: Partial<CartViewCallbacks> = {}): CartViewCallbacks {
  return { onQuantityChange: vi.fn(), onRemove: vi.fn(), onCheckout: vi.fn(), ...overrides };
}

describe("CartViewUI", () => {
  it("shows the API's own line price and lets the checkout through when every line is available", () => {
    const handlers = callbacks();
    render(<CartViewUI cart={cartFixture} busy={false} callbacks={handlers} />);

    expect(screen.getByTestId("cart-line-722915c1-c5c2-47a8-bb4d-a8ec67ffdabf")).toHaveTextContent(
      "2 × €25.99 = €51.98",
    );
    expect(screen.getByTestId("cart-subtotal")).toHaveTextContent("€51.98");

    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    expect(handlers.onCheckout).toHaveBeenCalledOnce();
  });

  it("blocks checkout and names the line problem when stock ran out", () => {
    // What the API says after someone else bought the last unit: `is_available:false`.
    const soldOut = {
      ...cartFixture,
      lines: [{ ...cartFixture.lines[0], is_available: false, available_stock: 0 }],
    };
    render(<CartViewUI cart={soldOut} busy={false} callbacks={callbacks()} />);

    expect(screen.getByTestId("cart-line-problem-722915c1-c5c2-47a8-bb4d-a8ec67ffdabf")).toHaveTextContent(
      "Sold out",
    );
    expect(screen.getByTestId("cart-blocked")).toHaveTextContent("cannot be checked out");
    expect(screen.getByRole("button", { name: "Checkout" })).toBeDisabled();
  });

  it("sends quantity edits and removals with the line id", () => {
    const handlers = callbacks();
    render(<CartViewUI cart={cartFixture} busy={false} callbacks={handlers} />);

    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "4" } });
    expect(handlers.onQuantityChange).toHaveBeenCalledWith(cartFixture.lines[0].id, 4);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(handlers.onRemove).toHaveBeenCalledWith(cartFixture.lines[0].id);
  });

  it("invites shopping when the cart is empty and hides the totals", () => {
    render(
      <CartViewUI cart={{ ...cartFixture, lines: [], total_price_cents: 0 }} busy={false} callbacks={callbacks()} />,
    );

    expect(screen.getByTestId("cart-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("cart-subtotal")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse products →" })).toHaveAttribute("href", "/search");
  });
});
