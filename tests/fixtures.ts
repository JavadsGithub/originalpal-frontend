import { HttpResponse, http } from "msw";
import type { PaginatedPayload } from "@/lib/types/api";
import type {
  AttributeDefinition,
  Category,
  Product,
  Sku,
} from "@/lib/types/catalog";
import type { CustomerAddress } from "@/lib/types/customer";
import type {
  Cart,
  CheckoutCreateRequest,
  DeliveryOption,
  Order,
  PaymentAttempt,
} from "@/lib/types/order";
import type {
  HomepageBlock,
  PublicHomepage,
  PublicProductDetail,
  PublicProductSummary,
} from "@/lib/types/storefront";
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

export const customerAddressFixture: CustomerAddress = {
  id: "b7c1d2e3-4f5a-4b6c-8d9e-0f1a2b3c4d5e",
  user_id: adminUser.id,
  label: "Home",
  recipient_name: "Admin User",
  phone: "+15550001",
  country: "US",
  city: "Boston",
  address_line1: "1 Beacon St",
  postal_code: "02108",
  is_default: true,
  created_at: "2026-10-15T18:23:20.300000Z",
  updated_at: "2026-10-15T18:23:20.300000Z",
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

// ---------------------------------------------------------------------------
// Storefront fixtures — copied from live `GET /api/catalog/products/` and
// `GET /api/homepage/` responses (audit §12)
// ---------------------------------------------------------------------------

export const publicProductFixture: PublicProductSummary = {
  id: "7c9f2f6e-0f5a-4a1f-9a2f-2f6e0f5a4a1f",
  title: "Probe Product",
  slug: "probe-product",
  category_id: categoryFixture.id,
  brand_id: null,
  summary: "A probe product",
  highlights: ["Hand forged"],
  gallery: ["8f14e45f-ceea-467f-a1f0-2b4c3d4e5f60"],
  min_price_cents: 2599,
  max_price_cents: 3199,
  has_stock: true,
  active_sku_count: 2,
};

export const publicProductDetailFixture: PublicProductDetail = {
  ...publicProductFixture,
  description: "A longer description of the probe product.",
  skus: [
    {
      id: "3f1c2b4a-1111-4222-8333-444455556666",
      code: "PROBE-S",
      option_values: { size: "S" },
      price_cents: 2599,
      stock_quantity: 4,
      image_gallery: [],
      is_available: true,
    },
    {
      id: "5a2d3c4b-7777-4888-8999-aaaabbbbcccc",
      code: "PROBE-L",
      option_values: { size: "L" },
      price_cents: 3199,
      stock_quantity: 0,
      image_gallery: [],
      is_available: false,
    },
  ],
};

/** A `products` block — the shape `POST /api/homepage/blocks/` accepts and returns. */
export const homepageBlockFixture: HomepageBlock = {
  id: "b1a2c3d4-5555-4666-8777-888899990000",
  block_type: "products",
  title: "Probe products",
  subtitle: "Handpicked",
  image_url: null,
  target_url: "/search",
  target_ids: [publicProductFixture.id],
  display_order: 1,
  is_active: true,
  created_at: "2026-10-16T06:52:31.607654Z",
  updated_at: "2026-10-16T06:52:31.607654Z",
};

/** The block the probe created with an id that resolves to nothing — the API accepts it happily. */
export const danglingHomepageBlockFixture: HomepageBlock = {
  ...homepageBlockFixture,
  id: "c2b3d4e5-6666-4777-8888-999900001111",
  title: "Ghost block",
  target_ids: ["11111111-2222-4333-8444-555566667777"],
  display_order: 0,
};

/** `GET /api/homepage/` — the five navigation entries are hardcoded on the backend. */
export const publicHomepageFixture: PublicHomepage = {
  blocks: [homepageBlockFixture],
  navigation: [
    { label: "Categories", href: "/categories" },
    { label: "Search", href: "/search" },
    { label: "Cart", href: "/cart" },
    { label: "Account", href: "/account" },
    { label: "Blog", href: "/blog" },
  ],
};

// ---------------------------------------------------------------------------
// Order fixtures — copies of live `POST /api/checkouts/` / `POST /api/carts/`
// responses (audit §13)
// ---------------------------------------------------------------------------

export const cartFixture: Cart = {
  id: "383891c2-6b41-4b2c-9a1f-0d1e2f3a4b5c",
  lines: [
    {
      id: "1b74a8f3-8c0e-4b8c-b1e6-0cd4a4e3b3ad",
      sku_id: "722915c1-c5c2-47a8-bb4d-a8ec67ffdabf",
      quantity: 2,
      unit_price_cents: 2599,
      line_price_cents: 5198,
      is_available: true,
      available_stock: 5,
      created_at: "2026-10-16T13:41:30.389681Z",
      updated_at: "2026-10-16T13:41:30.389681Z",
    },
  ],
  total_price_cents: 5198,
  created_at: "2026-10-16T13:41:30.371188Z",
  updated_at: "2026-10-16T13:41:30.389681Z",
};

export const deliveryOptionsFixture: DeliveryOption[] = [
  {
    id: "44c95ffa-1859-4d8f-9b5d-3a13f9b4ccbd",
    city: "Tehran",
    method: "standard",
    label: "Standard delivery",
    fee_cents: 500,
  },
  {
    id: "691c1a40-bc60-4eb6-bcbe-76ab0677ffff",
    city: "Tehran",
    method: "express",
    label: "Express delivery",
    fee_cents: 1000,
  },
];

/** The order as the live checkout returned it: 2 × 2599 + 1000 express delivery. */
export const orderFixture: Order = {
  id: "c78d7545-616f-4fd2-b24d-36375816756d",
  cart_id: cartFixture.id,
  guest_access_token: "9fHq2mS0kQ7vVn1xY3zA4bC5dE6fG7hI8jK9lM0nP1q",
  customer_id: null,
  status: "awaiting_payment",
  contact_name: "Guest Buyer",
  contact_email: "guest@example.com",
  contact_phone: null,
  city: "Tehran",
  address_line1: "Somewhere 1",
  postal_code: "12345",
  delivery_method: "express",
  delivery_fee_cents: 1000,
  carrier: null,
  tracking_reference: null,
  shipped_at: null,
  delivered_at: null,
  cancelled_at: null,
  cancellation_reason: null,
  refund_required: false,
  refund_reference: null,
  refunded_at: null,
  payment_expires_at: "2026-10-16T14:11:30.454891Z",
  payment_exception: false,
  payment_exception_reason: null,
  payment_exception_reference: null,
  items: [
    {
      id: "5c3a9f21-4d5e-4a6b-8c7d-9e0f1a2b3c4d",
      sku_id: cartFixture.lines[0].sku_id,
      sku_code: "ORD-PROBE-A",
      product_id: publicProductDetailFixture.id,
      product_title: "Probe Product",
      option_values: { size: "M" },
      quantity: 2,
      unit_price_cents: 2599,
      line_price_cents: 5198,
      created_at: "2026-10-16T13:41:30.454891Z",
    },
  ],
  subtotal_cents: 5198,
  total_cents: 6198,
  created_at: "2026-10-16T13:41:30.454891Z",
  updated_at: "2026-10-16T13:41:30.454891Z",
};

export const checkoutRequestFixture: CheckoutCreateRequest = {
  cart_id: cartFixture.id,
  contact_name: "Guest Buyer",
  contact_email: "guest@example.com",
  contact_phone: null,
  city: "Tehran",
  address_line1: "Somewhere 1",
  postal_code: "12345",
  delivery_method: "express",
};

export const paymentAttemptFixture: PaymentAttempt = {
  id: "28bd14b0-d582-4c9d-98ed-67bc39898af7",
  order_id: orderFixture.id,
  provider: "mock",
  amount_cents: orderFixture.total_cents,
  checkout_url: "https://payments.example/checkout/28bd14b0-d582-4c9d-98ed-67bc39898af7",
  provider_reference: null,
  status: "pending",
  failure_reason: null,
  created_at: "2026-10-16T13:41:41.255447Z",
  updated_at: "2026-10-16T13:41:41.255447Z",
};

/** The same order after the provider callback succeeded (`status=paid`, attempt `succeeded`). */
export const paidOrderFixture: Order = {
  ...orderFixture,
  status: "paid",
  customer_id: null,
  payment_exception: false,
};

export const cancelledPaidOrderFixture: Order = {
  ...paidOrderFixture,
  status: "cancelled",
  cancellation_reason: "customer changed mind",
  refund_required: true,
  cancelled_at: "2026-10-16T14:00:00Z",
};
