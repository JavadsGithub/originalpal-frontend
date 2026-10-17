import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import PublishChecklistUI, { type PublishChecklistCallbacks } from "./index";

const blockers = [
  {
    code: "gallery" as const,
    field: "gallery",
    message: "Product requires a primary image before publication",
  },
  {
    code: "attribute_values" as const,
    field: "attribute_values",
    message: "Required SKU attribute value is missing (Colour, SKU)",
  },
];

function callbacks(overrides: Partial<PublishChecklistCallbacks> = {}): PublishChecklistCallbacks {
  return { onPublish: vi.fn(), onUnpublish: vi.fn(), onJumpTo: vi.fn(), ...overrides };
}

describe("PublishChecklistUI", () => {
  it("lists the backend's blockers verbatim and routes each fix action", () => {
    const handlers = callbacks();

    render(
      <PublishChecklistUI
        status="draft"
        blockers={blockers}
        requiredAttributes={[
          { name: "Colour", levelLabel: "SKU", satisfied: false },
        ]}
        submitting={false}
        canPublish
        canUnpublish
        callbacks={handlers}
      />,
    );

    expect(screen.getByTestId("publish-blocker-gallery")).toHaveTextContent(
      "Product requires a primary image before publication",
    );

    fireEvent.click(screen.getByRole("button", { name: "Fix gallery" }));
    expect(handlers.onJumpTo).toHaveBeenCalledWith("gallery");

    fireEvent.click(screen.getByRole("button", { name: "Fix values" }));
    expect(handlers.onJumpTo).toHaveBeenCalledWith("attribute_values");

    expect(screen.getByText("missing")).toBeInTheDocument();
  });

  it("offers Publish when nothing blocks and Unpublish when live", () => {
    const handlers = callbacks();

    const { rerender } = render(
      <PublishChecklistUI
        status="draft"
        blockers={[]}
        requiredAttributes={[]}
        submitting={false}
        canPublish
        canUnpublish
        callbacks={handlers}
      />,
    );

    fireEvent.click(screen.getByTestId("publish-product"));
    expect(handlers.onPublish).toHaveBeenCalledTimes(1);

    rerender(
      <PublishChecklistUI
        status="published"
        blockers={[]}
        requiredAttributes={[]}
        submitting={false}
        canPublish
        canUnpublish
        callbacks={handlers}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Unpublish" }));
    expect(handlers.onUnpublish).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("publish-product")).not.toBeInTheDocument();
  });

  it("hides the action a caller may not perform", () => {
    render(
      <PublishChecklistUI
        status="draft"
        blockers={[]}
        requiredAttributes={[]}
        submitting={false}
        canPublish={false}
        canUnpublish={false}
        callbacks={callbacks()}
      />,
    );

    expect(screen.queryByTestId("publish-product")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unpublish" })).not.toBeInTheDocument();
  });
});
