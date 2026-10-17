import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductCard from "./index";
import { publicProductFixture } from "@/tests/fixtures";

describe("ProductCard", () => {
  it("links to the product by id and shows the price range", () => {
    render(<ProductCard product={publicProductFixture} />);

    expect(screen.getByTestId("product-card-probe-product")).toHaveAttribute(
      "href",
      `/products/${publicProductFixture.id}`,
    );
    expect(screen.getByText("€25.99 – €31.99")).toBeInTheDocument();
    expect(screen.getByText("2 variants")).toBeInTheDocument();
  });

  it("says images need staff access instead of rendering a broken <img>", () => {
    // Uploaded files are behind `uploads:download`, so an anonymous storefront cannot load them.
    render(<ProductCard product={publicProductFixture} />);

    expect(screen.getByText("Image needs staff access")).toBeInTheDocument();
  });

  it("shows the sold-out badge when the server reports no stock", () => {
    render(<ProductCard product={{ ...publicProductFixture, has_stock: false }} />);

    expect(screen.getByText("Sold out")).toBeInTheDocument();
  });

  it("uses the singular for a product with one variant", () => {
    render(<ProductCard product={{ ...publicProductFixture, active_sku_count: 1 }} />);

    expect(screen.getByText("1 variant")).toBeInTheDocument();
  });
});
