import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { waitFor } from "@testing-library/react";
import { server } from "@/tests/msw-server";
import { TEST_API_BASE, pageOf, publicProductFixture } from "@/tests/fixtures";
import { renderHookWithProviders } from "@/tests/render";
import useGetPublicProducts from "./useGetPublicProducts";

describe("useGetPublicProducts", () => {
  it("reads the public listing without an Authorization header and with the backend's params", async () => {
    const requests: Request[] = [];
    server.use(
      http.get(`${TEST_API_BASE}/catalog/products/`, ({ request }) => {
        requests.push(request);
        return HttpResponse.json({
          success: true,
          message: "Products retrieved successfully",
          payload: pageOf([publicProductFixture], { page: 2, size: 12, pages: 3, total: 30 }),
        });
      }),
    );

    const { result } = renderHookWithProviders(() =>
      useGetPublicProducts({ page: 2, size: 12, search: "probe", categoryId: "cat-1" }),
    );

    await waitFor(() => expect(result.current.products).toHaveLength(1));

    const url = new URL(requests[0].url);
    expect(url.pathname).toBe("/api/catalog/products/");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("size")).toBe("12");
    expect(url.searchParams.get("search")).toBe("probe");
    expect(url.searchParams.get("category_id")).toBe("cat-1");
    // The storefront has no session, so nothing may attach credentials to a public read.
    expect(requests[0].headers.get("authorization")).toBeNull();

    expect(result.current.total).toBe(30);
    expect(result.current.pages).toBe(3);
    expect(result.current.page).toBe(2);
  });

  it("omits blank filters instead of sending empty query values", async () => {
    const requests: Request[] = [];
    server.use(
      http.get(`${TEST_API_BASE}/catalog/products/`, ({ request }) => {
        requests.push(request);
        return HttpResponse.json({
          success: true,
          message: "Products retrieved successfully",
          payload: pageOf([]),
        });
      }),
    );

    const { result } = renderHookWithProviders(() =>
      useGetPublicProducts({ search: "   ", categoryId: undefined, brandId: undefined }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const url = new URL(requests[0].url);
    expect(url.searchParams.get("search")).toBeNull();
    expect(url.searchParams.get("category_id")).toBeNull();
  });

  it("never asks for more than the 100 items the API allows", async () => {
    const requests: Request[] = [];
    server.use(
      http.get(`${TEST_API_BASE}/catalog/products/`, ({ request }) => {
        requests.push(request);
        return HttpResponse.json({
          success: true,
          message: "Products retrieved successfully",
          payload: pageOf([]),
        });
      }),
    );

    const { result } = renderHookWithProviders(() => useGetPublicProducts({ size: 100 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(Number(new URL(requests[0].url).searchParams.get("size"))).toBeLessThanOrEqual(100);
  });
});
