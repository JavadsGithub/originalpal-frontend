import { describe, expect, it } from "vitest";
import { ApiError, toApiError } from "./api-error";
import { ApiErrorCode } from "./types/api";

/**
 * Every error shape the backend can produce, as verified against the live server.
 * See docs/integration/contract-audit.md §3.
 */
describe("ApiError.from", () => {
  it("reads the domain error envelope", () => {
    const error = toApiError({
      isAxiosError: true,
      response: {
        status: 401,
        data: {
          success: false,
          message: "Incorrect username or password",
          payload: { error_code: "CREDENTIALS_VALIDATION_ERROR", details: {}, status_code: 401 },
        },
      },
    });

    expect(error.status).toBe(401);
    expect(error.message).toBe("Incorrect username or password");
    expect(error.errorCode).toBe(ApiErrorCode.CredentialsValidation);
    expect(error.isUnauthorized).toBe(true);
    expect(error.isNetworkError).toBe(false);
  });

  it("flags 403 as forbidden without treating it as an expired session", () => {
    const error = toApiError({
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          success: false,
          message: "Access forbidden",
          payload: { error_code: "FORBIDDEN", details: {}, status_code: 403 },
        },
      },
    });

    expect(error.isForbidden).toBe(true);
    expect(error.isUnauthorized).toBe(false);
    expect(error.errorCode).toBe("FORBIDDEN");
  });

  it("normalises FastAPI's {detail:[...]} validation shape into field errors", () => {
    const error = toApiError({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          detail: [
            { type: "missing", loc: ["body", "password"], msg: "Field required", input: {} },
            { type: "value_error", loc: ["body", "email"], msg: "valid email is required", input: {} },
          ],
        },
      },
    });

    expect(error.status).toBe(422);
    expect(error.isValidationError).toBe(true);
    expect(error.message).toBe("Field required");
    expect(error.fieldErrors).toEqual({
      password: "Field required",
      email: "valid email is required",
    });
  });

  it("handles the unhandled-exception shape (payload.code, no details)", () => {
    const error = toApiError({
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          success: false,
          message: "An internal server error occurred",
          payload: { code: 500 },
        },
      },
    });

    expect(error.isServerError).toBe(true);
    expect(error.details).toEqual({});
    expect(error.message).toBe("An internal server error occurred");
  });

  it("handles FastAPI's simple {detail: string}", () => {
    const error = toApiError({
      isAxiosError: true,
      response: { status: 404, data: { detail: "Not Found" } },
    });

    expect(error.isNotFound).toBe(true);
    expect(error.message).toBe("Not Found");
  });

  it("maps a transport failure to a network error with helpful text", () => {
    const error = toApiError({ isAxiosError: true, message: "Network Error" });

    expect(error.status).toBe(0);
    expect(error.isNetworkError).toBe(true);
    expect(error.errorCode).toBe(ApiErrorCode.Network);
    expect(error.message).toContain("Cannot reach the API");
  });

  it("marks cancelled requests so hooks can ignore them", () => {
    const error = toApiError({ isAxiosError: true, code: "ERR_CANCELED" });

    expect(error.isCanceled).toBe(true);
  });

  it("wraps unknown values", () => {
    const error = toApiError("boom");

    expect(error).toBeInstanceOf(ApiError);
    expect(error.errorCode).toBe(ApiErrorCode.Unknown);
  });

  it("returns existing ApiError instances untouched", () => {
    const original = new ApiError({ message: "already normalised", status: 418 });
    expect(toApiError(original)).toBe(original);
  });

  it("surfaces a backend validation field from details", () => {
    const error = toApiError({
      isAxiosError: true,
      response: {
        status: 422,
        data: {
          success: false,
          message: "email is required",
          payload: {
            error_code: "VALIDATION_ERROR",
            details: { field: "email" },
            status_code: 422,
          },
        },
      },
    });

    expect(error.fieldErrors).toEqual({ email: "" });
    expect(error.isValidationError).toBe(true);
  });
});
