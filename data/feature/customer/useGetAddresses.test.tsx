import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { waitFor } from "@testing-library/react";
import { server } from "@/tests/msw-server";
import { TEST_API_BASE, customerAddressFixture, pageOf } from "@/tests/fixtures";
import { renderHookWithProviders } from "@/tests/render";
import useGetAddresses from "./useGetAddresses";

describe("useGetAddresses", () => {
  it("requests the collection with the trailing slash and the pagination params", async () => {
    const requests: Request[] = [];
    server.use(
      http.get(`${TEST_API_BASE}/me/addresses/`, ({ request }) => {
        requests.push(request);
        return HttpResponse.json({
          success: true,
          message: "Customer addresses retrieved successfully",
          payload: pageOf([customerAddressFixture], { size: 25 }),
        });
      }),
    );

    const { result } = renderHookWithProviders(() => useGetAddresses({ page: 2, size: 25 }));

    await waitFor(() => expect(result.current.addresses).toHaveLength(1));

    const url = new URL(requests[0].url);
    expect(url.pathname).toBe("/api/me/addresses/");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("size")).toBe("25");
    expect(result.current.total).toBe(1);
  });

  it("stays idle when disabled, so the address book can wait for a session", async () => {
    const requests: Request[] = [];
    server.use(
      http.get(`${TEST_API_BASE}/me/addresses/`, ({ request }) => {
        requests.push(request);
        return HttpResponse.json({
          success: true,
          message: "Customer addresses retrieved successfully",
          payload: pageOf([]),
        });
      }),
    );

    const { result } = renderHookWithProviders(() => useGetAddresses({ enabled: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(requests).toHaveLength(0);
  });
});
