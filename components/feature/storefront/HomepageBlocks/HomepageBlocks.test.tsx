import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import HomepageBlocksUI, { type HomepageBlockData } from "./index";
import {
  categoryFixture,
  danglingHomepageBlockFixture,
  homepageBlockFixture,
  publicProductFixture,
} from "@/tests/fixtures";

function blockData(overrides: Partial<HomepageBlockData> = {}): HomepageBlockData {
  return {
    block: homepageBlockFixture,
    products: [publicProductFixture],
    categories: [],
    missingTargetIds: [],
    ...overrides,
  };
}

describe("HomepageBlocksUI", () => {
  it("renders a products block as cards resolved from its target_ids", () => {
    render(<HomepageBlocksUI blocks={[blockData()]} />);

    expect(screen.getByTestId(`homepage-block-${homepageBlockFixture.id}`)).toBeInTheDocument();
    expect(screen.getByTestId("product-card-probe-product")).toBeInTheDocument();
    expect(screen.getByText("Products")).toBeInTheDocument();
  });

  it("renders a categories block as links into the category pages", () => {
    render(
      <HomepageBlocksUI
        blocks={[
          blockData({
            block: { ...homepageBlockFixture, block_type: "categories" },
            products: [],
            categories: [categoryFixture],
          }),
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Kitchen knives" })).toHaveAttribute(
      "href",
      `/categories/${categoryFixture.id}`,
    );
  });

  it("reports dangling target ids — the API stores them without validating", () => {
    render(
      <HomepageBlocksUI
        blocks={[
          blockData({
            block: danglingHomepageBlockFixture,
            products: [],
            missingTargetIds: ["11111111-2222-4333-8444-555566667777"],
          }),
        ]}
      />,
    );

    const warning = screen.getByTestId(`homepage-block-missing-${danglingHomepageBlockFixture.id}`);
    expect(within(warning).getByText("11111111-2222-4333-8444-555566667777")).toBeInTheDocument();
  });

  it("renders a banner's external image but refuses a permission-gated file URL", () => {
    const external = { ...homepageBlockFixture, block_type: "banner", image_url: "https://cdn.example.com/hero.png" };
    const { unmount } = render(<HomepageBlocksUI blocks={[blockData({ block: external, products: [] })]} />);
    expect(screen.getByTestId(`homepage-banner-image-${homepageBlockFixture.id}`)).toHaveAttribute(
      "src",
      "https://cdn.example.com/hero.png",
    );
    unmount();

    // `image_url` on the API's own file endpoint would 401 for a shopper — say so instead.
    render(
      <HomepageBlocksUI
        blocks={[
          blockData({
            block: {
              ...homepageBlockFixture,
              block_type: "banner",
              image_url: "http://127.0.0.1:8004/api/files/8f14e45f/download",
            },
            products: [],
          }),
        ]}
      />,
    );
    expect(
      screen.getByTestId(`homepage-banner-unavailable-${homepageBlockFixture.id}`),
    ).toHaveTextContent("not publicly readable");
  });

  it("links an internal target in-app and an external one in a new tab", () => {
    const { unmount } = render(<HomepageBlocksUI blocks={[blockData()]} />);
    expect(screen.getByRole("link", { name: "View all →" })).toHaveAttribute("href", "/search");
    unmount();

    render(
      <HomepageBlocksUI
        blocks={[
          blockData({
            block: { ...homepageBlockFixture, target_url: "https://campaign.example.com/promo" },
          }),
        ]}
      />,
    );
    const external = screen.getByRole("link", { name: "View all →" });
    expect(external).toHaveAttribute("href", "https://campaign.example.com/promo");
    expect(external).toHaveAttribute("rel", "noreferrer");
  });

  it("explains an empty homepage rather than rendering nothing", () => {
    render(<HomepageBlocksUI blocks={[]} />);

    expect(screen.getByTestId("homepage-blocks-empty")).toHaveTextContent(
      "no homepage blocks yet",
    );
  });
});
