import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { waitFor } from "@testing-library/react";
import { server } from "@/tests/msw-server";
import { TEST_API_BASE, publicHomepageFixture } from "@/tests/fixtures";
import { renderHookWithProviders } from "@/tests/render";
import useGetHomepage from "./useGetHomepage";

describe("useGetHomepage", () => {
  it("reads the public homepage and returns both blocks and navigation", async () => {
    const requests: Request[] = [];
    server.use(
      http.get(`${TEST_API_BASE}/homepage/`, ({ request }) => {
        requests.push(request);
        return HttpResponse.json({
          success: true,
          message: "Homepage retrieved successfully",
          payload: publicHomepageFixture,
        });
      }),
    );

    const { result } = renderHookWithProviders(() => useGetHomepage());

    await waitFor(() => expect(result.current.blocks).toHaveLength(1));

    expect(new URL(requests[0].url).pathname).toBe("/api/homepage/");
    expect(result.current.navigation).toHaveLength(5);
    expect(result.current.navigation.map((item) => item.href)).toEqual([
      "/categories",
      "/search",
      "/cart",
      "/account",
      "/blog",
    ]);
  });

  it("treats an empty block list as a valid homepage", async () => {
    server.use(
      http.get(`${TEST_API_BASE}/homepage/`, () =>
        HttpResponse.json({
          success: true,
          message: "Homepage retrieved successfully",
          payload: { blocks: [], navigation: [] },
        }),
      ),
    );

    const { result } = renderHookWithProviders(() => useGetHomepage());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.blocks).toEqual([]);
    expect(result.current.isError).toBe(false);
  });
});
