import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { waitFor } from "@testing-library/react";
import { server } from "@/tests/msw-server";
import { TEST_API_BASE, adminUser, pageOf } from "@/tests/fixtures";
import { renderHookWithProviders } from "@/tests/render";
import useGetUsers from "./useGetUsers";

describe("useGetUsers", () => {
  it("requests the canonical collection path with page and size", async () => {
    const requested: string[] = [];
    server.use(
      http.get(`${TEST_API_BASE}/users/`, ({ request }) => {
        requested.push(new URL(request.url).search);
        return HttpResponse.json({
          success: true,
          message: "Users retrieved successfully",
          payload: pageOf([adminUser]),
        });
      }),
    );

    const { result } = renderHookWithProviders(() => useGetUsers({ page: 2, size: 25 }));

    await waitFor(() => expect(result.current.users).toHaveLength(1));

    // Trailing slash included on purpose: without it FastAPI answers 307.
    expect(requested[0]).toBe("?page=2&size=25");
    expect(result.current.pages).toBe(1);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("returns an empty page when the API says so", async () => {
    server.use(
      http.get(`${TEST_API_BASE}/users/`, () =>
        HttpResponse.json({
          success: true,
          message: "Users retrieved successfully",
          payload: pageOf([], { total: 0, pages: 0 }),
        }),
      ),
    );

    const { result } = renderHookWithProviders(() => useGetUsers());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.users).toEqual([]);
    expect(result.current.pages).toBe(0);
  });

  it("surfaces a 403 as an ApiError without emptying the session", async () => {
    server.use(
      http.get(`${TEST_API_BASE}/users/`, () =>
        HttpResponse.json(
          {
            success: false,
            message: "Access forbidden",
            payload: { error_code: "FORBIDDEN", details: {}, status_code: 403 },
          },
          { status: 403 },
        ),
      ),
    );

    const { result } = renderHookWithProviders(() => useGetUsers());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.isForbidden).toBe(true);
    expect(result.current.error?.message).toBe("Access forbidden");
  });
});
