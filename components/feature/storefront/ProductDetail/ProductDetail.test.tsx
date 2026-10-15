import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ProductDetailUI from "./index";
import { publicProductDetailFixture } from "@/tests/fixtures";

describe("ProductDetailUI", () => {
  it("tabulates the SKUs the API marks active, with their available quantity", () => {
    render(<ProductDetailUI product={publicProductDetailFixture} categoryName="Kitchen knives" />);

    expect(screen.getByText("Kitchen knives")).toBeInTheDocument();

    const available = screen.getByTestId("public-sku-PROBE-S");
    expect(within(available).getByText("size: S")).toBeInTheDocument();
    expect(within(available).getByText("€25.99")).toBeInTheDocument();
    expect(within(available).getByText("In stock")).toBeInTheDocument();

    const soldOut = screen.getByTestId("public-sku-PROBE-L");
    expect(within(soldOut).getByText("Sold out")).toBeInTheDocument();
  });

  it("falls back to the summary when the product has no description", () => {
    render(
      <ProductDetailUI product={{ ...publicProductDetailFixture, description: null }} />,
    );

    expect(screen.getByText("A probe product")).toBeInTheDocument();
  });

  it("explains the gallery is file ids because downloads are permission-gated", () => {
    render(<ProductDetailUI product={publicProductDetailFixture} />);

    expect(screen.getByTestId("product-gallery")).toHaveTextContent(
      "uploaded files need the `uploads:download` permission",
    );
  });
});
