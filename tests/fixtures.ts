import { HttpResponse, http } from "msw";
import type { PaginatedPayload } from "@/lib/types/api";
import type { Role, TokenResponse, User } from "@/lib/types/auth";

/** Where the client points in tests (see `vitest.config.ts` → `test.env`). */
export const TEST_API_BASE = "http://localhost:3000/api";

// ---------------------------------------------------------------------------
// Fixtures — field-for-field copies of live backend responses
// ---------------------------------------------------------------------------

export const superUserPermissionId = "708269c3-6740-445d-a528-ff88c60c7eb5";

export const adminRole: Role = {
  id: "67572815-e4a0-4b64-9e9d-8553b8f3ae10",
  name: "Admin",
  is_active: true,
  permission_ids: [superUserPermissionId],
  created_at: "2026-10-15T17:56:49.141219Z",
  updated_at: "2026-10-15T17:56:49.141219Z",
};

export const adminUser: User = {
  id: "95a00c27-1e8e-44d2-8160-88c92c2269e0",
  first_name: "Admin",
  last_name: "User",
  email: "admin@example.com",
  username: "admin",
  is_active: true,
  roles: [adminRole],
  created_at: "2026-10-15T17:56:49.141219Z",
  updated_at: "2026-10-15T17:56:49.141219Z",
};

export const accessToken: TokenResponse = {
  title: "access_token",
  token: "test-jwt-token",
  type: "bearer",
  expires_at: "2026-10-15T18:26:54.211451Z",
};

export function pageOf<T>(items: T[], overrides: Partial<PaginatedPayload<T>> = {}) {
  return {
    items,
    total: items.length,
    page: 1,
    size: 50,
    pages: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** Live-verified shape: `{"success": true, "message": "pong", "payload": null}`. */
export const pingHandler = http.get(`${TEST_API_BASE}/ping`, () =>
  HttpResponse.json({ success: true, message: "pong", payload: null }),
);

export const loginHandler = http.post(`${TEST_API_BASE}/auth/login`, () =>
  HttpResponse.json(
    { success: true, message: "Login successful", payload: accessToken },
    { headers: { "Set-Cookie": "refresh_token=test-refresh; HttpOnly; Path=/; SameSite=strict" } },
  ),
);

/** Live-verified domain error envelope. */
export const badCredentialsHandler = http.post(`${TEST_API_BASE}/auth/login`, () =>
  HttpResponse.json(
    {
      success: false,
      message: "Incorrect username or password",
      payload: { error_code: "CREDENTIALS_VALIDATION_ERROR", details: {}, status_code: 401 },
    },
    { status: 401 },
  ),
);

/** FastAPI's own validation error — the second error shape the client must absorb. */
export const validationErrorHandler = http.post(`${TEST_API_BASE}/auth/login`, () =>
  HttpResponse.json(
    {
      detail: [
        { type: "missing", loc: ["body", "password"], msg: "Field required", input: { username: "admin" } },
      ],
    },
    { status: 422 },
  ),
);

export const meHandler = http.get(`${TEST_API_BASE}/auth/me`, () =>
  HttpResponse.json({ success: true, message: "User retrieved successfully", payload: adminUser }),
);

export const usersHandler = http.get(`${TEST_API_BASE}/users/`, ({ request }) => {
  const url = new URL(request.url);
  return HttpResponse.json({
    success: true,
    message: "Users retrieved successfully",
    payload: pageOf([adminUser], {
      page: Number(url.searchParams.get("page") ?? 1),
      size: Number(url.searchParams.get("size") ?? 50),
    }),
  });
});

/** 401 with no refresh cookie available → the session is over. */
export function sessionExpired(
  url: string,
  method: "get" | "post" | "put" | "delete" = "get",
) {
  return http[method](url, () =>
    HttpResponse.json(
      {
        success: false,
        message: "Could not validate credentials",
        payload: { error_code: "CREDENTIALS_VALIDATION_ERROR", details: {}, status_code: 401 },
      },
      { status: 401 },
    ),
  );
}
