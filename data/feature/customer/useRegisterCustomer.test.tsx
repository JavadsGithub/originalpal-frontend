import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { waitFor } from "@testing-library/react";
import { server } from "@/tests/msw-server";
import { TEST_API_BASE, adminUser } from "@/tests/fixtures";
import { renderHookWithProviders } from "@/tests/render";
import useRegisterCustomer from "./useRegisterCustomer";

describe("useRegisterCustomer", () => {
  it("POSTs the customer DTO exactly as the API defines it", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${TEST_API_BASE}/auth/register`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({
          success: true,
          message: "Customer registered successfully",
          payload: { ...adminUser, roles: [] },
        });
      }),
    );

    const { result } = renderHookWithProviders(() => useRegisterCustomer());

    result.current.mutate({
      first_name: "Cus",
      last_name: "Tomer",
      email: "cus@example.com",
      username: "cus",
      password: "Secret123",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(bodies[0]).toEqual({
      first_name: "Cus",
      last_name: "Tomer",
      email: "cus@example.com",
      username: "cus",
      password: "Secret123",
    });
  });

  it("normalises a 409 into an ApiError with the backend's message", async () => {
    server.use(
      http.post(`${TEST_API_BASE}/auth/register`, () =>
        HttpResponse.json(
          {
            success: false,
            message: "User with username 'cus' already exists",
            payload: { error_code: "CONFLICT", details: {}, status_code: 409 },
          },
          { status: 409 },
        ),
      ),
    );

    const { result } = renderHookWithProviders(() => useRegisterCustomer());

    result.current.mutate({
      first_name: "Cus",
      last_name: "Tomer",
      email: "other@example.com",
      username: "cus",
      password: "Secret123",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.errorCode).toBe("CONFLICT");
    expect(result.current.error?.message).toBe("User with username 'cus' already exists");
  });
});
