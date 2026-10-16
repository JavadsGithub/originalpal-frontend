import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "@/tests/render";
import ProductDetailUI from "./index";
import { publicProductDetailFixture } from "@/tests/fixtures";

describe("ProductDetailUI", () => {
  it("tabulates the SKUs the API marks active, with their available quantity", () => {
    renderWithProviders(<ProductDetailUI product={publicProductDetailFixture} categoryName="Kitchen knives" />);

    expect(screen.getByText("Kitchen knives")).toBeInTheDocument();

    const available = screen.getByTestId("public-sku-PROBE-S");
    expect(within(available).getByText("size: S")).toBeInTheDocument();
    expect(within(available).getByText("€25.99")).toBeInTheDocument();
    expect(within(available).getByText("In stock")).toBeInTheDocument();
    // Every SKU row carries the buy control the cart slice added.
    expect(within(available).getByRole("button", { name: "Add to cart" })).toBeEnabled();

    // A sold-out row says so twice on purpose: the availability badge, and the buy button that is
    // disabled and relabelled rather than hidden.
    const soldOut = screen.getByTestId("public-sku-PROBE-L");
    expect(within(soldOut).getAllByText("Sold out")).toHaveLength(2);
    expect(within(soldOut).getByRole("button", { name: "Sold out" })).toBeDisabled();
  });

  it("falls back to the summary when the product has no description", () => {
    renderWithProviders(
      <ProductDetailUI product={{ ...publicProductDetailFixture, description: null }} />,
    );

    expect(screen.getByText("A probe product")).toBeInTheDocument();
  });

  it("explains the gallery is file ids because downloads are permission-gated", () => {
    renderWithProviders(<ProductDetailUI product={publicProductDetailFixture} />);

    expect(screen.getByTestId("product-gallery")).toHaveTextContent(
      "uploaded files need the `uploads:download` permission",
    );
  });
});
