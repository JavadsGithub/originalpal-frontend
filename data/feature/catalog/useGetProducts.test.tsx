import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { waitFor } from "@testing-library/react";
import { server } from "@/tests/msw-server";
import { TEST_API_BASE, pageOf, productFixture } from "@/tests/fixtures";
import { renderHookWithProviders } from "@/tests/render";
import useGetProducts from "./useGetProducts";

describe("useGetProducts", () => {
  it("sends the backend's filter names, not our camelCase ones", async () => {
    const requested: URLSearchParams[] = [];
    server.use(
      http.get(`${TEST_API_BASE}/products/`, ({ request }) => {
        requested.push(new URL(request.url).searchParams);
        return HttpResponse.json({
          success: true,
          message: "Products retrieved successfully",
          payload: pageOf([productFixture]),
        });
      }),
    );

    const { result } = renderHookWithProviders(() =>
      useGetProducts({
        page: 1,
        size: 25,
        status: "draft",
        categoryId: "cat-1",
        brandId: "brand-1",
        search: "knife",
      }),
    );

    await waitFor(() => expect(result.current.products).toHaveLength(1));

    const params = requested[0];
    expect(params.get("page")).toBe("1");
    expect(params.get("size")).toBe("25");
    expect(params.get("status")).toBe("draft");
    expect(params.get("category_id")).toBe("cat-1");
    expect(params.get("brand_id")).toBe("brand-1");
    expect(params.get("search")).toBe("knife");
  });

  it("omits empty filters instead of sending blank values", async () => {
    const received: URLSearchParams[] = [];
    server.use(
      http.get(`${TEST_API_BASE}/products/`, ({ request }) => {
        received.push(new URL(request.url).searchParams);
        return HttpResponse.json({
          success: true,
          message: "Products retrieved successfully",
          payload: pageOf([]),
        });
      }),
    );

    const { result } = renderHookWithProviders(() => useGetProducts({ search: "" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const params = received[0];
    expect(params.has("status")).toBe(false);
    expect(params.has("category_id")).toBe(false);
    expect(params.has("brand_id")).toBe(false);
    expect(params.has("search")).toBe(false);
  });

  it("keeps the envelope's pagination metadata", async () => {
    server.use(
      http.get(`${TEST_API_BASE}/products/`, () =>
        HttpResponse.json({
          success: true,
          message: "Products retrieved successfully",
          payload: pageOf([productFixture, { ...productFixture, id: "p-2", slug: "knife-2" }], {
            total: 51,
            page: 2,
            size: 25,
            pages: 3,
          }),
        }),
      ),
    );

    const { result } = renderHookWithProviders(() => useGetProducts({ page: 2, size: 25 }));

    await waitFor(() => expect(result.current.products).toHaveLength(2));
    expect(result.current.total).toBe(51);
    expect(result.current.pages).toBe(3);
    expect(result.current.page).toBe(2);
  });
});
