import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, normalizePage } from "./api";

describe("normalizePage", () => {
  it("passes a complete backend page through", () => {
    const page = normalizePage({
      items: [1, 2, 3],
      total: 3,
      page: 2,
      size: 10,
      pages: 1,
    });

    expect(page).toEqual({ items: [1, 2, 3], total: 3, page: 2, size: 10, pages: 1 });
  });

  it("fills in missing and null fields", () => {
    const page = normalizePage(null, { page: 3, size: 25 });

    expect(page).toEqual({
      items: [],
      total: 0,
      page: 3,
      size: 25,
      pages: 0,
    });
  });

  it("coalesces a null pages value (fastapi_pagination can emit null)", () => {
    const page = normalizePage({
      items: [],
      total: 0,
      page: 1,
      size: 50,
      pages: null,
    });

    expect(page.pages).toBe(0);
  });

  it("falls back to the frontend defaults", () => {
    const page = normalizePage(undefined);

    expect(page.page).toBe(DEFAULT_PAGE);
    expect(page.size).toBe(DEFAULT_PAGE_SIZE);
  });
});
