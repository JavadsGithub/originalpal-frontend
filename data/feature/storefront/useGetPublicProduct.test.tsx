import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { waitFor } from "@testing-library/react";
import { server } from "@/tests/msw-server";
import { TEST_API_BASE, publicProductDetailFixture } from "@/tests/fixtures";
import { renderHookWithProviders } from "@/tests/render";
import useGetPublicProduct from "./useGetPublicProduct";

const NOT_FOUND = {
  success: false,
  message: "Resource not found",
  payload: {
    error_code: "RESOURCE_NOT_FOUND",
    details: {},
    status_code: 404,
  },
};

describe("useGetPublicProduct", () => {
  it("reads one product by id and exposes the active SKUs", async () => {
    const requests: Request[] = [];
    server.use(
      http.get(`${TEST_API_BASE}/catalog/products/:productId`, ({ request }) => {
        requests.push(request);
        return HttpResponse.json({
          success: true,
          message: "Product retrieved successfully",
          payload: publicProductDetailFixture,
        });
      }),
    );

    const { result } = renderHookWithProviders(() =>
      useGetPublicProduct(publicProductDetailFixture.id),
    );

    await waitFor(() => expect(result.current.product).not.toBeNull());

    expect(new URL(requests[0].url).pathname).toBe(
      `/api/catalog/products/${publicProductDetailFixture.id}`,
    );
    expect(result.current.product?.skus.map((sku) => sku.code)).toEqual(["PROBE-S", "PROBE-L"]);
  });

  it("flags a 404 as not-found — drafts and sold-out-of-active-SKUs products both answer that", async () => {
    server.use(
      http.get(`${TEST_API_BASE}/catalog/products/:productId`, () =>
        HttpResponse.json(NOT_FOUND, { status: 404 }),
      ),
    );

    const { result } = renderHookWithProviders(() => useGetPublicProduct("unknown-id"));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.isNotFound).toBe(true);
  });

  it("does not request anything without an id", async () => {
    const requests: Request[] = [];
    server.use(
      http.get(`${TEST_API_BASE}/catalog/products/:productId`, ({ request }) => {
        requests.push(request);
        return HttpResponse.json({ success: true, message: "", payload: publicProductDetailFixture });
      }),
    );

    const { result } = renderHookWithProviders(() => useGetPublicProduct(""));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(requests).toHaveLength(0);
  });
});
