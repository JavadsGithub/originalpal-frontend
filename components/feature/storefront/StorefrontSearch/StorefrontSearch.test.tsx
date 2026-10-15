import { describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { server } from "@/tests/msw-server";
import {
  TEST_API_BASE,
  categoryFixture,
  pageOf,
  publicProductFixture,
} from "@/tests/fixtures";
import { renderWithProviders } from "@/tests/render";
import StorefrontSearch from "./StorefrontSearch";

const replace = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
  usePathname: () => "/search",
}));

function listingHandler(requests: URL[]) {
  return http.get(`${TEST_API_BASE}/catalog/products/`, ({ request }) => {
    requests.push(new URL(request.url));
    return HttpResponse.json({
      success: true,
      message: "Products retrieved successfully",
      payload: pageOf([publicProductFixture]),
    });
  });
}

describe("StorefrontSearch", () => {
  it("sends the typed term and mirrors the filters into the URL", async () => {
    const listingRequests: URL[] = [];
    server.use(
      listingHandler(listingRequests),
      http.get(`${TEST_API_BASE}/categories/`, () =>
        HttpResponse.json({
          success: true,
          message: "Categories retrieved successfully",
          payload: pageOf([categoryFixture]),
        }),
      ),
      http.get(`${TEST_API_BASE}/brands/`, () =>
        HttpResponse.json({
          success: true,
          message: "Brands retrieved successfully",
          payload: pageOf([]),
        }),
      ),
    );

    renderWithProviders(
      <StorefrontSearch initialFilters={{ search: "", categoryId: "", brandId: "" }} />,
    );

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "probe" } });

    await waitFor(() =>
      expect(listingRequests.some((url) => url.searchParams.get("search") === "probe")).toBe(true),
    );

    await waitFor(() =>
      expect(
        replace.mock.calls.some(([url]) => typeof url === "string" && url.includes("q=probe")),
      ).toBe(true),
    );
  });

  it("applies a category select immediately and resets back to the unfiltered URL", async () => {
    const listingRequests: URL[] = [];
    server.use(
      listingHandler(listingRequests),
      http.get(`${TEST_API_BASE}/categories/`, () =>
        HttpResponse.json({
          success: true,
          message: "Categories retrieved successfully",
          payload: pageOf([categoryFixture]),
        }),
      ),
      http.get(`${TEST_API_BASE}/brands/`, () =>
        HttpResponse.json({
          success: true,
          message: "Brands retrieved successfully",
          payload: pageOf([]),
        }),
      ),
    );

    renderWithProviders(
      <StorefrontSearch initialFilters={{ search: "", categoryId: "", brandId: "" }} />,
    );

    const select = await screen.findByLabelText("Category");
    await waitFor(() => expect(screen.getByRole("option", { name: categoryFixture.name })).toBeTruthy());
    fireEvent.change(select, { target: { value: categoryFixture.id } });

    await waitFor(() =>
      expect(
        listingRequests.some((url) => url.searchParams.get("category_id") === categoryFixture.id),
      ).toBe(true),
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    await waitFor(() =>
      expect(
        replace.mock.calls.some(([url]) => url === "/search"),
      ).toBe(true),
    );
    // Reset always asks for the unfiltered first page again.
    expect(listingRequests[listingRequests.length - 1].searchParams.get("category_id")).toBeNull();
  });
});
