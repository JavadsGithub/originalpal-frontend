import { HttpResponse, http } from "msw";
import type { PaginatedPayload } from "@/lib/types/api";
import type {
  AttributeDefinition,
  Category,
  Product,
  Sku,
} from "@/lib/types/catalog";
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

// ---------------------------------------------------------------------------
// Catalog fixtures — same field-for-field approach as the auth ones
// ---------------------------------------------------------------------------

export const categoryFixture: Category = {
  id: "1a718486-a104-4f91-8b67-da8fa1e1de0d",
  name: "Kitchen knives",
  slug: "kitchen-knives",
  parent_id: null,
  created_at: "2026-10-15T18:23:19.999935Z",
  updated_at: "2026-10-15T18:23:19.999935Z",
};

export const attributeDefinitionFixture: AttributeDefinition = {
  id: "f50785b0-39d1-4846-9419-7fcfed486090",
  name: "Colour",
  slug: "colour",
  value_type: "single_choice",
  unit: null,
  choices: ["red", "blue"],
  is_specification: false,
  is_filterable: false,
  is_variant: true,
  display_order: 1,
  group: "Appearance",
  created_at: "2026-10-15T18:23:20.000000Z",
  updated_at: "2026-10-15T18:23:20.000000Z",
};

export const productFixture: Product = {
  id: "dad1907d-5cc0-4c92-b2c7-68d8d7be3ed7",
  title: "Chef knife",
  slug: "chef-knife",
  category_id: categoryFixture.id,
  brand_id: null,
  summary: "A knife.",
  description: "A very good knife.",
  highlights: ["Hand forged"],
  gallery: ["uploads/k1.jpg"],
  status: "draft",
  created_at: "2026-10-15T18:23:20.100000Z",
  updated_at: "2026-10-15T18:23:20.100000Z",
};

export const skuFixture: Sku = {
  id: "8e4c1d0b-4f4a-4a1f-9c0a-1d2f3a4b5c6d",
  product_id: productFixture.id,
  code: "CHEF-20",
  option_values: { size: "20cm" },
  price_cents: 129900,
  stock_quantity: 8,
  reserved_quantity: 2,
  committed_quantity: 0,
  available_quantity: 6,
  image_gallery: [],
  is_active: true,
  created_at: "2026-10-15T18:23:20.200000Z",
  updated_at: "2026-10-15T18:23:20.200000Z",
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
