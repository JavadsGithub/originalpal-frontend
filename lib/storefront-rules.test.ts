import { describe, expect, it } from "vitest";
import {
  blockCtaLabel,
  formatProductPrice,
  formatSkuAvailability,
  formatSkuOptions,
  isInternalHref,
  isPubliclyRenderableImage,
  resolveBlockTargets,
  stockState,
} from "./storefront-rules";
import {
  danglingHomepageBlockFixture,
  homepageBlockFixture,
  publicProductFixture,
} from "@/tests/fixtures";

describe("storefront-rules", () => {
  it("prints a single price when every active SKU costs the same", () => {
    expect(formatProductPrice({ min_price_cents: 2599, max_price_cents: 2599 })).toBe("€25.99");
  });

  it("prints the range the backend computed across active SKUs", () => {
    // Live probe values: SKUs at 2599 and 3199.
    expect(formatProductPrice({ min_price_cents: 2599, max_price_cents: 3199 })).toBe(
      "€25.99 – €31.99",
    );
  });

  it("reads the server's own has_stock flag instead of deriving it from a SKU list", () => {
    // The list payload has no SKUs, so `has_stock` is the only signal available on a card.
    expect(stockState(publicProductFixture)).toBe("in_stock");
    expect(stockState({ has_stock: false })).toBe("out_of_stock");
  });

  it("formats SKU options and availability the way the API reports them", () => {
    expect(formatSkuOptions({ size: "L", color: "red" })).toBe("size: L · color: red");
    expect(formatSkuOptions({})).toBe("");
    expect(formatSkuAvailability({ is_available: true, stock_quantity: 2 })).toBe("Only 2 left");
    expect(formatSkuAvailability({ is_available: true, stock_quantity: 9 })).toBe("In stock");
    expect(formatSkuAvailability({ is_available: false, stock_quantity: 0 })).toBe("Sold out");
  });

  it("splits a block's targets into resolved and missing — the API does not validate them", () => {
    const { resolved, missing } = resolveBlockTargets(homepageBlockFixture, [publicProductFixture]);
    expect(resolved.map((product) => product.id)).toEqual([publicProductFixture.id]);
    expect(missing).toEqual([]);

    // The probe's "ghost" block: an unknown id is accepted by the API and comes back in the feed.
    const ghost = resolveBlockTargets(danglingHomepageBlockFixture, [publicProductFixture]);
    expect(ghost.resolved).toEqual([]);
    expect(ghost.missing).toEqual(["11111111-2222-4333-8444-555566667777"]);
  });

  it("only renders banner images that a shopper can actually fetch", () => {
    // An uploaded file answers 401 anonymously, so `image_url` pointing at the API cannot render.
    expect(isPubliclyRenderableImage("https://cdn.example.com/hero.png")).toBe(true);
    expect(isPubliclyRenderableImage("/uploads/hero.png")).toBe(false);
    expect(isPubliclyRenderableImage("http://127.0.0.1:8004/api/files/1f2/download")).toBe(false);
    expect(isPubliclyRenderableImage(null)).toBe(false);
  });

  it("only treats storefront paths as internal links", () => {
    expect(isInternalHref("/search")).toBe(true);
    expect(isInternalHref("//evil.example.com")).toBe(false);
    expect(isInternalHref("https://example.com")).toBe(false);
  });

  it("labels the call to action only when the block has a target", () => {
    expect(blockCtaLabel({ block_type: "banner", target_url: "/search" })).toBe("Shop now");
    expect(blockCtaLabel({ block_type: "products", target_url: "/search" })).toBe("View all");
    expect(blockCtaLabel({ block_type: "products", target_url: null })).toBeNull();
  });
});
