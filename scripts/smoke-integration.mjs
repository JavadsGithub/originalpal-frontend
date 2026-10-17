#!/usr/bin/env node
/**
 * End-to-end integration smoke test: browser-facing contract → Next.js proxy → FastAPI backend.
 *
 * It asserts the things that break first when the two projects drift apart: the response
 * envelope, the login/refresh/logout cookie lifecycle, the access-token flow, the RBAC payload, the
 * pagination shape, and the catalog lifecycle (upload → product → SKU → publish → archive).
 *
 * Prerequisites: the backend is running (default http://127.0.0.1:8004) and this app is serving
 * through its dev/production server so the `/api/*` proxy is active.
 *
 * Usage:
 *   pnpm dev                      # terminal 1
 *   node scripts/smoke-integration.mjs
 *
 * Environment:
 *   SMOKE_BASE_URL    frontend origin to hit        (default http://127.0.0.1:3000)
 *   SMOKE_USERNAME    seeded backend account        (default admin)
 *   SMOKE_PASSWORD    seeded backend password       (default Secret123)
 */

const BASE_URL = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(
  /\/+$/,
  "",
);
const USERNAME = process.env.SMOKE_USERNAME ?? "admin";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "Secret123";

let failures = 0;
let checks = 0;

const green = (text) => `\u001b[32m${text}\u001b[0m`;
const red = (text) => `\u001b[31m${text}\u001b[0m`;
const dim = (text) => `\u001b[2m${text}\u001b[0m`;

function pass(label, note = "") {
  checks += 1;
  console.log(`${green("✓")} ${label}${note ? ` ${dim(note)}` : ""}`);
}

function fail(label, detail) {
  checks += 1;
  failures += 1;
  console.log(`${red("✖")} ${label}\n    ${red(String(detail))}`);
}

function expect(condition, label, detail) {
  if (condition) pass(label, detail);
  else fail(label, detail);
}

async function request(path, { method = "GET", token, cookie, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });

  let json = null;
  const text = await response.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  const setCookies = response.headers.getSetCookie?.() ?? [];

  return { status: response.status, json, text, setCookies };
}

function refreshCookies(setCookies) {
  for (const cookie of setCookies) {
    if (cookie.startsWith("refresh_token=")) return cookie.split(";")[0];
  }
  return null;
}

async function main() {
  console.log(`\nSmoke-testing ${BASE_URL} against the proxied backend\n`);

  // 1. Envelope on an unauthenticated endpoint (through the proxy).
  const ping = await request("/api/ping");
  expect(ping.status === 200, "GET /api/ping → 200", `got ${ping.status}`);
  expect(
    ping.json?.success === true && ping.json?.message === "pong",
    "  envelope {success,message} intact through the proxy",
    JSON.stringify(ping.json)?.slice(0, 120),
  );
  expect(
    ping.json?.payload === null,
    "  payload is null (message-only endpoint is not treated as an error)",
    JSON.stringify(ping.json?.payload),
  );

  // 2. Rejecting bad credentials with the domain error envelope.
  const badLogin = await request("/api/auth/login", {
    method: "POST",
    body: { username: USERNAME, password: "definitely-not-the-password" },
  });
  expect(
    badLogin.status === 401 && badLogin.json?.payload?.error_code === "CREDENTIALS_VALIDATION_ERROR",
    "POST /api/auth/login (bad password) → 401 CREDENTIALS_VALIDATION_ERROR",
    `${badLogin.status} ${JSON.stringify(badLogin.json?.payload)}`,
  );

  // 3. Login: access token in the envelope, refresh token in an HttpOnly cookie.
  const login = await request("/api/auth/login", {
    method: "POST",
    body: { username: USERNAME, password: PASSWORD },
  });
  if (login.status !== 200 || !login.json?.payload?.token) {
    fail("POST /api/auth/login (valid) → 200 with access token", `${login.status} ${login.text.slice(0, 200)}`);
    console.log(
      `\n${red("Cannot continue without a session.")} Is the backend running and seeded (admin/Secret123)?\n`,
    );
    process.exit(1);
  }
  pass("POST /api/auth/login → 200 with access token");

  const token = login.json.payload.token;
  expect(
    typeof login.json.payload.expires_at === "string" && login.json.payload.type === "bearer",
    "  Token DTO {title,token,type,expires_at} matches lib/types/auth.ts",
  );

  const loginCookie = refreshCookies(login.setCookies);
  expect(Boolean(loginCookie), "  refresh_token cookie issued");
  expect(
    login.setCookies.some((cookie) => /httponly/i.test(cookie) && /samesite=strict/i.test(cookie)),
    "  cookie is HttpOnly + SameSite=strict",
    dim("first-party because the browser talks to its own origin"),
  );

  // 4. Identity + RBAC payloads.
  const me = await request("/api/auth/me", { token });
  expect(me.status === 200 && me.json?.payload?.username === USERNAME, "GET /api/auth/me → 200", `got ${me.status}`);
  expect(
    Array.isArray(me.json?.payload?.roles) &&
      me.json.payload.roles.every((role) => Array.isArray(role.permission_ids)),
    "  User → Role → permission_ids shape present",
  );

  const permissions = await request("/api/auth/permissions", { token });
  expect(
    permissions.status === 200 && Array.isArray(permissions.json?.payload),
    "GET /api/auth/permissions → 200 list",
    `got ${permissions.status}`,
  );
  expect(
    (permissions.json?.payload?.length ?? 0) >= 19,
    "  permission registry returned",
    `${permissions.json?.payload?.length ?? 0} permissions (lib/permissions.ts holds 49)`,
  );

  // 5. Pagination contract.
  const users = await request("/api/users/?page=1&size=5", { token });
  const page = users.json?.payload;
  expect(users.status === 200, "GET /api/users/?page=1&size=5 → 200", `got ${users.status}`);
  expect(
    page && Array.isArray(page.items) && "total" in page && "page" in page && "size" in page && "pages" in page,
    "  Page payload {items,total,page,size,pages} matches PaginatedPayload",
    JSON.stringify(page && Object.keys(page)),
  );

  const noSlash = await request("/api/users?page=1&size=5", { token });
  expect(
    noSlash.status === 200 || noSlash.status === 307,
    "GET /api/users (no trailing slash) documented as 307 → collection paths need the slash",
    `got ${noSlash.status}`,
  );

  // 5b. Admin slice lifecycle — exactly what the back office screens drive, headless.
  const suffix = Date.now().toString(36);
  const newUsername = `smoke-${suffix}`;
  const newEmail = `${newUsername}@example.com`;

  const created = await request("/api/users/", {
    method: "POST",
    token,
    body: {
      first_name: "Smoke",
      last_name: "Test",
      email: newEmail,
      username: newUsername,
      password: "Secret123",
    },
  });
  const createdUser = created.json?.payload;
  expect(
    created.status === 201 || created.status === 200,
    "POST /api/users/ → new account",
    `got ${created.status}`,
  );
  expect(
    createdUser?.is_active === false,
    "  account is created INACTIVE — activation is a second, explicit step",
    `is_active=${createdUser?.is_active}`,
  );

  if (createdUser?.id) {
    const inactiveLogin = await request("/api/auth/login", {
      method: "POST",
      body: { username: newUsername, password: "Secret123" },
    });
    expect(
      inactiveLogin.status === 401 && inactiveLogin.json?.payload?.error_code === "INACTIVE_USER",
      "  signing in as the new user → 401 INACTIVE_USER (documented in EditUserDialog)",
      `${inactiveLogin.status} ${inactiveLogin.json?.payload?.error_code}`,
    );

    const activated = await request(`/api/users/${createdUser.id}`, {
      method: "PUT",
      token,
      body: { is_active: true },
    });
    expect(
      activated.status === 200 && activated.json?.payload?.is_active === true,
      "PUT /api/users/{id} {is_active:true} → account activated",
      `got ${activated.status}`,
    );

    const activeLogin = await request("/api/auth/login", {
      method: "POST",
      body: { username: newUsername, password: "Secret123" },
    });
    expect(
      activeLogin.status === 200 && Boolean(activeLogin.json?.payload?.token),
      "  signing in after activation → 200 (activation semantics verified)",
      `got ${activeLogin.status}`,
    );

    // Roles: catalogue shape + assign/unassign through the user-scoped endpoints.
    const roles = await request("/api/roles/?page=1&size=100", { token });
    const roleItems = roles.json?.payload?.items ?? [];
    expect(
      roles.status === 200 &&
        roleItems.length > 0 &&
        roleItems.every((role) => Array.isArray(role.permission_ids)),
      "GET /api/roles/ → Role → permission_ids shape present",
      `${roleItems.length} roles`,
    );

    const targetRole = roleItems.find((role) => role.name === "Admin") ?? roleItems[0];
    if (targetRole) {
      const assigned = await request(`/api/users/${createdUser.id}/roles/${targetRole.id}`, {
        method: "POST",
        token,
      });
      expect(
        assigned.status === 200 &&
          (assigned.json?.payload?.roles ?? []).some((role) => role.id === targetRole.id),
        "POST /api/users/{id}/roles/{roleId} → updated user carries the role",
        `got ${assigned.status}`,
      );

      const unassigned = await request(`/api/users/${createdUser.id}/roles/${targetRole.id}`, {
        method: "DELETE",
        token,
      });
      expect(
        unassigned.status === 200 &&
          !(unassigned.json?.payload?.roles ?? []).some((role) => role.id === targetRole.id),
        "DELETE /api/users/{id}/roles/{roleId} → role removed",
        `got ${unassigned.status}`,
      );
    }

    const deleted = await request(`/api/users/${createdUser.id}`, { method: "DELETE", token });
    expect(
      deleted.status === 200 || deleted.status === 204,
      "DELETE /api/users/{id} → cleanup",
      `got ${deleted.status}`,
    );
  }

  // 5c. Catalog lifecycle — the same calls the back-office screens make, headless.
  //
  // The catalog reads are public, everything else is permission-gated, and publication is the one
  // operation whose three gates are worth asserting (each 422 carries `details.field`, which the
  // product page's checklist mirrors).
  for (const [path, what] of [
    ["/api/products/?page=1&size=1", "products"],
    ["/api/categories/?page=1&size=1", "categories"],
    ["/api/brands/?page=1&size=1", "brands"],
    ["/api/attributes/?page=1&size=1", "attributes"],
  ]) {
    const publicRead = await request(path);
    expect(
      publicRead.status === 200 && Array.isArray(publicRead.json?.payload?.items),
      `GET ${path} → 200 paginated without a token`,
      `got ${publicRead.status} for ${what}`,
    );
  }

  const filesAnonymous = await request("/api/files");
  expect(
    filesAnonymous.status === 401,
    "GET /api/files → 401 anonymously (upload endpoints are gated, and this one has no trailing slash)",
    `got ${filesAnonymous.status}`,
  );

  const catalogSuffix = `smoke-${suffix}-catalog`;
  const cleanup = [];

  const uploadResponse = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: (() => {
      const form = new FormData();
      // 1x1 transparent PNG.
      const png = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AARAAE/wD7uLzAAAAAAElFTkSuQmCC",
        "base64",
      );
      form.append("file", new Blob([png], { type: "image/png" }), "smoke.png");
      return form;
    })(),
  });
  const uploaded = { status: uploadResponse.status, json: await uploadResponse.json().catch(() => null) };
  const uploadedFile = uploaded.json?.payload;
  expect(
    uploaded.status === 201 && Boolean(uploadedFile?.id),
    "POST /api/upload (multipart) → 201 with the file record",
    `got ${uploaded.status}`,
  );
  if (uploadedFile?.id) cleanup.push(["file", `/api/files/${uploadedFile.id}`]);

  const category = await request("/api/categories/", {
    method: "POST",
    token,
    body: { name: `Smoke category ${suffix}`, slug: `${catalogSuffix}`, parent_id: null },
  });
  const createdCategory = category.json?.payload;
  expect(category.status === 200, "POST /api/categories/ → 200", `got ${category.status}`);
  if (createdCategory?.id) cleanup.push(["category", `/api/categories/${createdCategory.id}`]);

  const attribute = await request("/api/attributes/", {
    method: "POST",
    token,
    body: {
      name: `Smoke colour ${suffix}`,
      slug: `${catalogSuffix}-colour`,
      // A definition needs at least one purpose flag, and a variant must be a single choice.
      value_type: "single_choice",
      choices: ["red", "blue"],
      is_variant: true,
    },
  });
  const createdAttribute = attribute.json?.payload;
  expect(attribute.status === 200, "POST /api/attributes/ → 200", `got ${attribute.status}`);
  if (createdAttribute?.id) cleanup.push(["attribute", `/api/attributes/${createdAttribute.id}`]);

  const purposeless = await request("/api/attributes/", {
    method: "POST",
    token,
    body: { name: `No purpose ${suffix}`, slug: `${catalogSuffix}-nopurpose`, value_type: "text" },
  });
  expect(
    purposeless.status === 422 && purposeless.json?.payload?.details?.field === "purpose",
    "POST /api/attributes/ (no purpose flag) → 422 field=purpose",
    `got ${purposeless.status}`,
  );

  const product = await request("/api/products/", {
    method: "POST",
    token,
    body: {
      title: `Smoke product ${suffix}`,
      slug: `${catalogSuffix}`,
      category_id: createdCategory?.id,
      brand_id: null,
    },
  });
  const createdProduct = product.json?.payload;
  expect(product.status === 200, "POST /api/products/ → 200", `got ${product.status}`);
  if (createdProduct?.id) cleanup.push(["product", `/api/products/${createdProduct.id}`]);

  const duplicateSlug = await request("/api/products/", {
    method: "POST",
    token,
    body: { title: `Smoke product ${suffix} again`, slug: `${catalogSuffix}`, category_id: createdCategory?.id },
  });
  expect(
    duplicateSlug.status === 409 && duplicateSlug.json?.payload?.error_code === "CONFLICT",
    "POST /api/products/ (slug already taken by a non-archived product) → 409 CONFLICT",
    `got ${duplicateSlug.status} / ${duplicateSlug.json?.payload?.error_code}`,
  );

  // A second definition, answered once per product (this one is a specification, not a variant).
  const specification = await request("/api/attributes/", {
    method: "POST",
    token,
    body: {
      name: `Smoke weight ${suffix}`,
      slug: `${catalogSuffix}-weight`,
      value_type: "number",
      unit: "g",
      is_specification: true,
    },
  });
  const createdSpecification = specification.json?.payload;
  expect(specification.status === 200, "POST /api/attributes/ (number + unit) → 200", `got ${specification.status}`);
  if (createdSpecification?.id) {
    cleanup.push(["attribute", `/api/attributes/${createdSpecification.id}`]);
  }

  // A variant attribute may only be linked per SKU — the backend says so explicitly.
  const wrongLevel = await request(`/api/categories/${createdCategory?.id}/attributes/`, {
    method: "POST",
    token,
    body: {
      attribute_definition_id: createdAttribute?.id,
      is_required: true,
      value_level: "product_or_sku",
    },
  });
  expect(
    wrongLevel.status === 422 && wrongLevel.json?.payload?.details?.field === "value_level",
    "POST /api/categories/{id}/attributes/ (variant at product_or_sku) → 422 field=value_level",
    `got ${wrongLevel.status} / field=${wrongLevel.json?.payload?.details?.field}`,
  );

  // The SKU-level link the publish gate reads.
  const link = await request(`/api/categories/${createdCategory?.id}/attributes/`, {
    method: "POST",
    token,
    body: {
      attribute_definition_id: createdAttribute?.id,
      is_required: true,
      value_level: "sku",
    },
  });
  expect(
    link.status === 200 && link.json?.payload?.value_level === "sku",
    "POST /api/categories/{id}/attributes/ → 200 (variant linked per SKU)",
    `got ${link.status}`,
  );
  if (link.json?.payload?.id) {
    cleanup.push([
      "link",
      `/api/categories/${createdCategory?.id}/attributes/${link.json.payload.id}`,
    ]);
  }

  const specificationLink = await request(`/api/categories/${createdCategory?.id}/attributes/`, {
    method: "POST",
    token,
    body: {
      attribute_definition_id: createdSpecification?.id,
      is_required: false,
      value_level: "product_or_sku",
    },
  });
  expect(
    specificationLink.status === 200,
    "  and a specification linked at product_or_sku → 200",
    `got ${specificationLink.status}`,
  );
  if (specificationLink.json?.payload?.id) {
    cleanup.push([
      "link",
      `/api/categories/${createdCategory?.id}/attributes/${specificationLink.json.payload.id}`,
    ]);
  }

  const linkList = await request(`/api/categories/${createdCategory?.id}/attributes/?page=1&size=100`);
  expect(
    linkList.status === 200 &&
      (linkList.json?.payload?.items ?? []).every(
        (entry) => "item" in entry && "inherited" in entry && "source_category_id" in entry,
      ),
    "GET /api/categories/{id}/attributes/ → {item,inherited,source_category_id} entries",
    `got ${linkList.status}`,
  );

  // Publication, gate by gate.
  const galleryless = await request(`/api/products/${createdProduct?.id}/publish`, {
    method: "POST",
    token,
  });
  expect(
    galleryless.status === 422 && galleryless.json?.payload?.details?.field === "gallery",
    "POST /api/products/{id}/publish (no gallery) → 422 field=gallery",
    `got ${galleryless.status} / field=${galleryless.json?.payload?.details?.field}`,
  );

  await request(`/api/products/${createdProduct?.id}`, {
    method: "PUT",
    token,
    body: { gallery: [uploadedFile?.id] },
  });

  const skuless = await request(`/api/products/${createdProduct?.id}/publish`, {
    method: "POST",
    token,
  });
  expect(
    skuless.status === 422 && skuless.json?.payload?.details?.field === "skus",
    "  …then 422 field=skus (no active SKU)",
    `got ${skuless.status} / field=${skuless.json?.payload?.details?.field}`,
  );

  const sku = await request(`/api/products/${createdProduct?.id}/skus/`, {
    method: "POST",
    token,
    body: { code: `${catalogSuffix}-sku`, price_cents: 1999, stock_quantity: 5 },
  });
  const createdSku = sku.json?.payload;
  expect(sku.status === 200, "POST /api/products/{id}/skus/ → 200", `got ${sku.status}`);
  if (createdSku?.id) cleanup.push(["sku", `/api/products/${createdProduct?.id}/skus/${createdSku.id}`]);

  const valueless = await request(`/api/products/${createdProduct?.id}/publish`, {
    method: "POST",
    token,
  });
  expect(
    valueless.status === 422 && valueless.json?.payload?.details?.field === "attribute_values",
    "  …then 422 field=attribute_values (required attribute unanswered)",
    `got ${valueless.status} / field=${valueless.json?.payload?.details?.field}`,
  );

  // The `value` is free-form JSON on the wire but typed against the definition — a number sent as a
  // string is refused (this is what `lib/types/catalog.ts` + `AttributeValueField` encode).
  const wrongType = await request(`/api/products/${createdProduct?.id}/attribute-values/`, {
    method: "POST",
    token,
    body: { attribute_definition_id: createdSpecification?.id, value: "250" },
  });
  expect(
    wrongType.status === 422 && wrongType.json?.payload?.details?.field === "value",
    "POST /api/products/{id}/attribute-values/ (number sent as text) → 422 field=value",
    `got ${wrongType.status} / field=${wrongType.json?.payload?.details?.field}`,
  );

  // Product-scope value for the specification…
  const productValue = await request(`/api/products/${createdProduct?.id}/attribute-values/`, {
    method: "POST",
    token,
    body: { attribute_definition_id: createdSpecification?.id, value: 250 },
  });
  expect(
    productValue.status === 200 && productValue.json?.payload?.value === 250,
    "  …with the right JSON type → 200 value=250",
    `got ${productValue.status} / value=${JSON.stringify(productValue.json?.payload?.value)}`,
  );

  // …and a SKU-scope value for the variant, which is the answer the gate is still missing.
  const outOfChoices = await request(
    `/api/products/${createdProduct?.id}/skus/${createdSku?.id}/attribute-values/`,
    {
      method: "POST",
      token,
      body: { attribute_definition_id: createdAttribute?.id, value: "green" },
    },
  );
  expect(
    outOfChoices.status === 422 && outOfChoices.json?.payload?.details?.field === "value",
    "POST …/skus/{skuId}/attribute-values/ (choice outside the definition) → 422 field=value",
    `got ${outOfChoices.status} / field=${outOfChoices.json?.payload?.details?.field}`,
  );

  const skuValue = await request(
    `/api/products/${createdProduct?.id}/skus/${createdSku?.id}/attribute-values/`,
    {
      method: "POST",
      token,
      body: { attribute_definition_id: createdAttribute?.id, value: "red" },
    },
  );
  expect(
    skuValue.status === 200,
    "  …an allowed choice → 200",
    `got ${skuValue.status}`,
  );

  const published = await request(`/api/products/${createdProduct?.id}/publish`, {
    method: "POST",
    token,
  });
  expect(
    published.status === 200 && published.json?.payload?.status === "published",
    "  …publish → 200 status=published once all three gates pass",
    `got ${published.status} / status=${published.json?.payload?.status}`,
  );

  const draftFilter = await request("/api/products/?page=1&size=5&status=draft");
  expect(
    draftFilter.status === 200 && draftFilter.json?.payload?.items !== undefined,
    "GET /api/products/?status=draft → 200 (status filter accepted)",
    `got ${draftFilter.status}`,
  );

  const badStatus = await request("/api/products/?status=live");
  expect(
    badStatus.status === 422 && Array.isArray(badStatus.json?.detail),
    "GET /api/products/?status=live → FastAPI 422 (the enum is draft|published|archived)",
    `got ${badStatus.status}`,
  );

  // Stock: +3 must be recorded, and a zero delta must be refused by FastAPI's own validator.
  const adjusted = await request(
    `/api/products/${createdProduct?.id}/skus/${createdSku?.id}/stock-adjustments`,
    { method: "POST", token, body: { quantity_delta: 3, reason: "smoke restock" } },
  );
  expect(
    adjusted.status === 200 && adjusted.json?.payload?.sku?.stock_quantity === 8,
    "POST …/stock-adjustments (+3) → 200 stock_quantity=8",
    `got ${adjusted.status} / stock=${adjusted.json?.payload?.sku?.stock_quantity}`,
  );

  const zeroDelta = await request(
    `/api/products/${createdProduct?.id}/skus/${createdSku?.id}/stock-adjustments`,
    { method: "POST", token, body: { quantity_delta: 0, reason: "smoke" } },
  );
  expect(
    zeroDelta.status === 422 && Array.isArray(zeroDelta.json?.detail),
    "  quantity_delta=0 → FastAPI 422 (field detail, not the envelope)",
    `got ${zeroDelta.status}`,
  );

  const priceLess = await request(`/api/products/${createdProduct?.id}/skus/`, {
    method: "POST",
    token,
    body: { code: `${catalogSuffix}-sku-cheap`, price_cents: 0 },
  });
  expect(
    priceLess.status === 422 && priceLess.json?.payload?.details?.field === "price_cents",
    "POST …/skus/ price_cents=0 → 422 field=price_cents",
    `got ${priceLess.status} / field=${priceLess.json?.payload?.details?.field}`,
  );

  // 5e. Storefront browsing — the public, read-only surface a shopper's browser drives.
  //
  // Every assertion below runs **anonymous**: `/api/catalog/products/` and `/api/homepage/` are the
  // only endpoints the storefront is allowed to need. The product used here is the one the back
  // office just published in 5c, so this section is also the proof that "published with an active SKU"
  // is what makes a product shopper-visible.
  const storefrontCleanup = [];

  const publicHomepage = await request("/api/homepage/");
  expect(
    publicHomepage.status === 200 && Array.isArray(publicHomepage.json?.payload?.blocks),
    "GET /api/homepage/ (anonymous) → 200 with a blocks array",
    `got ${publicHomepage.status}`,
  );
  const navigation = publicHomepage.json?.payload?.navigation ?? [];
  expect(
    navigation.map((item) => item.href).join(",") ===
      "/categories,/search,/cart,/account,/blog",
    "  navigation carries the backend's five storefront entries",
    JSON.stringify(navigation.map((item) => item.href)),
  );

  const blocksAnonymous = await request("/api/homepage/blocks/");
  expect(
    blocksAnonymous.status === 401 &&
      blocksAnonymous.json?.payload?.error_code === "CREDENTIALS_VALIDATION_ERROR",
    "GET /api/homepage/blocks/ (anonymous) → 401 (the management list stays closed)",
    `got ${blocksAnonymous.status}`,
  );

  const publicList = await request("/api/catalog/products/?page=1&size=5");
  const publicItems = publicList.json?.payload?.items ?? [];
  expect(
    publicList.status === 200 &&
      Array.isArray(publicItems) &&
      typeof publicList.json?.payload?.total === "number",
    "GET /api/catalog/products/ (anonymous) → 200 with the pagination payload",
    `got ${publicList.status} / keys=${Object.keys(publicList.json?.payload ?? {}).join(",")}`,
  );
  const publicSummaryKeys = [
    "active_sku_count",
    "brand_id",
    "category_id",
    "gallery",
    "has_stock",
    "highlights",
    "id",
    "max_price_cents",
    "min_price_cents",
    "slug",
    "summary",
    "title",
  ];
  const summaryKeys = Object.keys(publicItems[0] ?? {}).sort();
  expect(
    summaryKeys.join(",") === publicSummaryKeys.join(","),
    "  the public summary is exactly the 12 documented fields (no cost, no SKUs, no status)",
    summaryKeys.join(","),
  );

  const publicDetail = await request(`/api/catalog/products/${createdProduct?.id}`);
  const publicDetailPayload = publicDetail.json?.payload;
  expect(
    publicDetail.status === 200 &&
      "description" in (publicDetailPayload ?? {}) &&
      Array.isArray(publicDetailPayload?.skus),
    "GET /api/catalog/products/{id} (anonymous) → 200, detail adds description + skus",
    `got ${publicDetail.status}`,
  );
  const publicSkuKeys = [
    "code",
    "id",
    "image_gallery",
    "is_available",
    "option_values",
    "price_cents",
    "stock_quantity",
  ];
  const detailSkuKeys = Object.keys(publicDetailPayload?.skus?.[0] ?? {}).sort();
  expect(
    detailSkuKeys.join(",") === publicSkuKeys.join(","),
    "  a public SKU exposes neither cost nor reserved/committed quantities",
    detailSkuKeys.join(","),
  );

  // Images: the storefront cannot render a product photo — file downloads are permission-gated.
  const anonymousImage = await request(`/api/files/${uploadedFile?.id}/download`);
  expect(
    anonymousImage.status === 401,
    "  GET /api/files/{id}/download (anonymous) → 401 — uploaded images are not public (follow-up #15)",
    `got ${anonymousImage.status}`,
  );

  const searchBySkuCode = await request(
    `/api/catalog/products/?page=1&size=5&search=${encodeURIComponent(`${catalogSuffix}-sku`)}`,
  );
  expect(
    (searchBySkuCode.json?.payload?.items ?? []).some((item) => item.id === createdProduct?.id),
    "  ?search matches a SKU code, not just the title/slug",
    `matches=${searchBySkuCode.json?.payload?.total}`,
  );

  const tooLarge = await request("/api/catalog/products/?page=1&size=101");
  expect(
    tooLarge.status === 422 &&
      JSON.stringify(tooLarge.json?.detail ?? "").includes("less_than_equal"),
    "  ?size=101 → FastAPI 422 less_than_equal (the listing caps size at 100)",
    `got ${tooLarge.status}`,
  );

  const zeroPage = await request("/api/catalog/products/?page=0&size=5");
  expect(
    zeroPage.status === 422 &&
      zeroPage.json?.detail?.[0]?.loc?.join(".") === "query.page" &&
      zeroPage.json?.detail?.[0]?.type === "greater_than_equal",
    "  ?page=0 → FastAPI 422 detail[0].loc=query.page (both bounds stay pydantic, not the envelope)",
    `got ${zeroPage.status} / ${JSON.stringify(zeroPage.json?.detail?.[0]?.loc)}`,
  );

  // Category filtering is an exact match: a product in a child category is invisible while browsing
  // the parent. The storefront therefore links to the children instead of pretending to cover them.
  // Categories are added to cleanup last: a category that still has products (or a child) answers 409.
  const storefrontCategoryCleanup = [];
  const parentCategory = await request("/api/categories/", {
    method: "POST",
    token,
    body: { name: `Smoke parent ${suffix}`, slug: `${catalogSuffix}-parent`, parent_id: null },
  });
  const createdParent = parentCategory.json?.payload;
  if (createdParent?.id)
    storefrontCategoryCleanup.push(["category", `/api/categories/${createdParent.id}`]);

  const childCategory = await request("/api/categories/", {
    method: "POST",
    token,
    body: {
      name: `Smoke child ${suffix}`,
      slug: `${catalogSuffix}-child`,
      parent_id: createdParent?.id,
    },
  });
  const createdChild = childCategory.json?.payload;
  if (createdChild?.id) {
    // Unshifted: the child has to go before its parent.
    storefrontCategoryCleanup.unshift(["category", `/api/categories/${createdChild.id}`]);
  }

  const moved = await request(`/api/products/${createdProduct?.id}`, {
    method: "PUT",
    token,
    body: { category_id: createdChild?.id },
  });
  expect(
    moved.status === 200 && moved.json?.payload?.category_id === createdChild?.id,
    "PUT /api/products/{id} (move into a child category) → 200",
    `got ${moved.status}`,
  );

  const byChild = await request(
    `/api/catalog/products/?page=1&size=5&category_id=${createdChild?.id}`,
  );
  const byParent = await request(
    `/api/catalog/products/?page=1&size=5&category_id=${createdParent?.id}`,
  );
  expect(
    (byChild.json?.payload?.items ?? []).some((item) => item.id === createdProduct?.id) &&
      !(byParent.json?.payload?.items ?? []).some((item) => item.id === createdProduct?.id),
    "  ?category_id does not roll up: the child finds the product, the parent does not (follow-up #14)",
    `child=${byChild.json?.payload?.total} parent=${byParent.json?.payload?.total}`,
  );

  // Move the product back so the temporary categories can be deleted in cleanup.
  await request(`/api/products/${createdProduct?.id}`, {
    method: "PUT",
    token,
    body: { category_id: createdCategory?.id },
  });

  // A second, out-of-stock SKU: the public numbers are the roll-up over **active** SKUs only.
  //
  // The variant's attribute value travels inside `option_values` (keyed by attribute slug) — and it
  // has to differ from the first SKU's, because `option_signature` is unique per product.
  const colourSlug = `${catalogSuffix}-colour`;
  const secondSku = await request(`/api/products/${createdProduct?.id}/skus/`, {
    method: "POST",
    token,
    body: {
      code: `${catalogSuffix}-sku-alt`,
      price_cents: 3199,
      stock_quantity: 0,
      option_values: { [colourSlug]: "blue" },
    },
  });
  const createdSecondSku = secondSku.json?.payload;
  expect(
    secondSku.status === 200 && createdSecondSku?.option_values?.[colourSlug] === "blue",
    "POST /api/products/{id}/skus/ with option_values → 200 (the variant value ships with the SKU)",
    `got ${secondSku.status} / ${JSON.stringify(createdSecondSku?.option_values)}`,
  );
  if (createdSecondSku?.id) {
    storefrontCleanup.push([
      "sku",
      `/api/products/${createdProduct?.id}/skus/${createdSecondSku.id}`,
    ]);
  }

  const duplicateCombination = await request(`/api/products/${createdProduct?.id}/skus/`, {
    method: "POST",
    token,
    body: {
      code: `${catalogSuffix}-sku-dup`,
      price_cents: 2500,
      option_values: { [colourSlug]: "blue" },
    },
  });
  expect(
    duplicateCombination.status === 409 &&
      duplicateCombination.json?.payload?.error_code === "CONFLICT",
    "  the same option combination twice → 409 CONFLICT (option_signature is unique per product)",
    `got ${duplicateCombination.status} / ${duplicateCombination.json?.payload?.error_code}`,
  );

  const rolledUp = await request(
    `/api/catalog/products/?page=1&size=5&search=${encodeURIComponent(catalogSuffix)}`,
  );
  const rolledUpItem = (rolledUp.json?.payload?.items ?? []).find(
    (item) => item.id === createdProduct?.id,
  );
  expect(
    rolledUpItem?.min_price_cents === 1999 &&
      rolledUpItem?.max_price_cents === 3199 &&
      rolledUpItem?.has_stock === true &&
      rolledUpItem?.active_sku_count === 2,
    "  min/max/has_stock/active_sku_count roll up over the active SKUs (1999–3199, 2 SKUs)",
    JSON.stringify(rolledUpItem && {
      min: rolledUpItem.min_price_cents,
      max: rolledUpItem.max_price_cents,
      has_stock: rolledUpItem.has_stock,
      skus: rolledUpItem.active_sku_count,
    }),
  );

  // Inline `option_values` bypass `skus/{id}/attribute-values/`' validation entirely.
  const looseOptionValues = await request(`/api/products/${createdProduct?.id}/skus/`, {
    method: "POST",
    token,
    body: {
      code: `${catalogSuffix}-sku-loose`,
      price_cents: 2500,
      option_values: { "not-an-attribute-slug": "not-an-option" },
    },
  });
  const createdLooseSku = looseOptionValues.json?.payload;
  expect(
    looseOptionValues.status === 200 &&
      createdLooseSku?.option_values?.["not-an-attribute-slug"] === "not-an-option",
    "  an unknown option slug is stored and served as-is — inline option_values are unvalidated (follow-up #16)",
    `got ${looseOptionValues.status} / ${JSON.stringify(createdLooseSku?.option_values)}`,
  );
  if (createdLooseSku?.id) {
    const removedLooseSku = await request(
      `/api/products/${createdProduct?.id}/skus/${createdLooseSku.id}`,
      { method: "DELETE", token },
    );
    if (![200, 204, 404].includes(removedLooseSku.status)) {
      fail("cleanup DELETE the deliberately loose SKU", `got ${removedLooseSku.status}`);
    }
  }

  // Deactivating the only stocked SKU flips the card to sold out without hiding the product.
  const deactivated = await request(
    `/api/products/${createdProduct?.id}/skus/${createdSku?.id}`,
    { method: "PUT", token, body: { is_active: false } },
  );
  const afterDeactivate = await request(`/api/catalog/products/${createdProduct?.id}`);
  expect(
    deactivated.status === 200 &&
      afterDeactivate.status === 200 &&
      afterDeactivate.json?.payload?.min_price_cents === 3199 &&
      afterDeactivate.json?.payload?.max_price_cents === 3199 &&
      afterDeactivate.json?.payload?.has_stock === false &&
      afterDeactivate.json?.payload?.active_sku_count === 1,
    "  deactivating the stocked SKU → min=max=3199, has_stock false, active_sku_count 1",
    `${deactivated.status} / ${JSON.stringify(afterDeactivate.json?.payload?.has_stock)}`,
  );

  // A draft with an active SKU is still invisible; publish is what flips it.
  const draftProduct = await request("/api/products/", {
    method: "POST",
    token,
    body: {
      title: `Smoke draft ${suffix}`,
      slug: `${catalogSuffix}-draft`,
      category_id: createdChild?.id,
      brand_id: null,
    },
  });
  const createdDraft = draftProduct.json?.payload;
  if (createdDraft?.id) {
    storefrontCleanup.push(["draft-product", `/api/products/${createdDraft.id}`]);
  }
  const draftSku = await request(`/api/products/${createdDraft?.id}/skus/`, {
    method: "POST",
    token,
    body: { code: `${catalogSuffix}-draft-sku`, price_cents: 999, stock_quantity: 3 },
  });
  if (draftSku.json?.payload?.id) {
    storefrontCleanup.push([
      "sku",
      `/api/products/${createdDraft?.id}/skus/${draftSku.json.payload.id}`,
    ]);
  }
  const draftRead = await request(`/api/catalog/products/${createdDraft?.id}`);
  const draftListed = await request(
    `/api/catalog/products/?page=1&size=5&search=${encodeURIComponent(`${catalogSuffix}-draft`)}`,
  );
  expect(
    draftRead.status === 404 &&
      draftRead.json?.payload?.error_code === "RESOURCE_NOT_FOUND" &&
      draftListed.json?.payload?.total === 0,
    "  a draft with an active SKU is neither readable nor listed (404 RESOURCE_NOT_FOUND)",
    `${draftRead.status} / total=${draftListed.json?.payload?.total}`,
  );

  // Homepage blocks: what the editor writes is exactly what the storefront renders.
  const blockOrderLate = await request("/api/homepage/blocks/", {
    method: "POST",
    token,
    body: {
      block_type: "products",
      title: `Smoke block late ${suffix}`,
      target_ids: [createdProduct?.id],
      display_order: 9,
      is_active: true,
    },
  });
  const lateBlock = blockOrderLate.json?.payload;
  if (lateBlock?.id) storefrontCleanup.push(["block", `/api/homepage/blocks/${lateBlock.id}`]);

  const blockOrderEarly = await request("/api/homepage/blocks/", {
    method: "POST",
    token,
    body: {
      block_type: "products",
      title: `Smoke block early ${suffix}`,
      target_ids: [createdProduct?.id],
      display_order: 1,
      is_active: true,
    },
  });
  const earlyBlock = blockOrderEarly.json?.payload;
  if (earlyBlock?.id) storefrontCleanup.push(["block", `/api/homepage/blocks/${earlyBlock.id}`]);

  const inactiveBlock = await request("/api/homepage/blocks/", {
    method: "POST",
    token,
    body: {
      block_type: "products",
      title: `Smoke block inactive ${suffix}`,
      target_ids: [createdProduct?.id],
      display_order: 2,
      is_active: false,
    },
  });
  expect(
    inactiveBlock.status === 200 && inactiveBlock.json?.payload?.is_active === false,
    "POST /api/homepage/blocks/ is_active:false → 200 (an editor can stage a block)",
    `got ${inactiveBlock.status}`,
  );
  if (inactiveBlock.json?.payload?.id) {
    storefrontCleanup.push(["block", `/api/homepage/blocks/${inactiveBlock.json.payload.id}`]);
  }

  const ghostBlock = await request("/api/homepage/blocks/", {
    method: "POST",
    token,
    body: {
      block_type: "products",
      title: `Smoke ghost block ${suffix}`,
      // Deliberately unknown: the API stores what it is given.
      target_ids: ["00000000-0000-4000-8000-000000000000"],
      display_order: 3,
      is_active: true,
    },
  });
  if (ghostBlock.json?.payload?.id) {
    storefrontCleanup.push(["block", `/api/homepage/blocks/${ghostBlock.json.payload.id}`]);
  }

  const badBlockType = await request("/api/homepage/blocks/", {
    method: "POST",
    token,
    body: { block_type: "carousel", title: `Smoke bad type ${suffix}` },
  });
  expect(
    badBlockType.status === 422 &&
      badBlockType.json?.payload?.details?.field === "block_type",
    "POST /api/homepage/blocks/ (unknown block_type) → 422 field=block_type",
    `got ${badBlockType.status} / field=${badBlockType.json?.payload?.details?.field}`,
  );

  const bannerWithoutUrls = await request("/api/homepage/blocks/", {
    method: "POST",
    token,
    body: { block_type: "banner", title: `Smoke banner ${suffix}`, image_url: "https://x/y.png" },
  });
  expect(
    bannerWithoutUrls.status === 422 &&
      bannerWithoutUrls.json?.payload?.details?.field === "image_url" &&
      /image and target URLs/.test(bannerWithoutUrls.json?.message ?? ""),
    "POST /api/homepage/blocks/ (banner without target_url) → 422 field=image_url (both URLs required)",
    `got ${bannerWithoutUrls.status} / ${bannerWithoutUrls.json?.message}`,
  );

  const targetlessBlock = await request("/api/homepage/blocks/", {
    method: "POST",
    token,
    body: { block_type: "categories", title: `Smoke categories ${suffix}` },
  });
  expect(
    targetlessBlock.status === 422 && targetlessBlock.json?.payload?.details?.field === "target_ids",
    "  products/categories are 'curated' blocks: an empty target_ids → 422 field=target_ids",
    `got ${targetlessBlock.status} / field=${targetlessBlock.json?.payload?.details?.field}`,
  );

  const blankTitle = await request("/api/homepage/blocks/", {
    method: "POST",
    token,
    body: { block_type: "banner", title: "   " },
  });
  expect(
    blankTitle.status === 422 && blankTitle.json?.payload?.details?.field === "title",
    "  blank title → 422 field=title",
    `got ${blankTitle.status} / field=${blankTitle.json?.payload?.details?.field}`,
  );

  const feedAfterBlocks = await request("/api/homepage/");
  const feedBlocks = feedAfterBlocks.json?.payload?.blocks ?? [];
  const feedTitles = feedBlocks.map((block) => block.title);
  expect(
    feedTitles.includes(`Smoke block late ${suffix}`) &&
      feedTitles.includes(`Smoke block early ${suffix}`),
    "GET /api/homepage/ (anonymous) → the new active blocks appear in the public feed",
    `${feedBlocks.length} block(s)`,
  );
  expect(
    !feedBlocks.some((block) => block.title === `Smoke block inactive ${suffix}`),
    "  is_active:false is excluded from the public feed",
    `${feedBlocks.length} block(s)`,
  );
  expect(
    feedBlocks.some((block) => block.title === `Smoke ghost block ${suffix}`) &&
      (feedBlocks.find((block) => block.title === `Smoke ghost block ${suffix}`)?.target_ids ?? [])
        .length === 1,
    "  an unknown target_ids value is published as-is — nothing validates it (follow-up #12)",
    "ghost block served to the storefront",
  );

  // The feed is ordered by `display_order` (then created_at, id) — the late block was created first and
  // must still come after the early one.
  const lateIndex = feedTitles.indexOf(`Smoke block late ${suffix}`);
  const earlyIndex = feedTitles.indexOf(`Smoke block early ${suffix}`);
  expect(
    lateIndex !== -1 && earlyIndex !== -1 && earlyIndex < lateIndex,
    "  the public feed is ordered by display_order (created last, ordered first: 1 before 9)",
    `early=${earlyIndex} late=${lateIndex}`,
  );

  const clearedSubtitle = await request(`/api/homepage/blocks/${earlyBlock?.id}`, {
    method: "PUT",
    token,
    body: { subtitle: null },
  });
  expect(
    clearedSubtitle.status === 200 &&
      clearedSubtitle.json?.payload?.subtitle === null &&
      clearedSubtitle.json?.payload?.title === `Smoke block early ${suffix}`,
    "PUT /api/homepage/blocks/{id} {subtitle:null} → 200, subtitle cleared, title kept",
    `got ${clearedSubtitle.status}`,
  );

  const nullTitle = await request(`/api/homepage/blocks/${earlyBlock?.id}`, {
    method: "PUT",
    token,
    body: { title: null },
  });
  expect(
    nullTitle.status === 422,
    "  explicit title:null → 422 (the update schema rejects null for required fields)",
    `got ${nullTitle.status}`,
  );

  // Cleanup, in dependency order, so a re-run starts from the same state.
  for (const [what, path] of [...storefrontCleanup, ...storefrontCategoryCleanup]) {
    const removed = await request(path, { method: "DELETE", token });
    if (![200, 204, 404].includes(removed.status)) {
      fail(`cleanup DELETE ${what} ${path}`, `got ${removed.status}`);
    }
  }

  // Archiving hides the product completely: it answers 404 afterwards.
  const archived = await request(`/api/products/${createdProduct?.id}`, { method: "DELETE", token });
  expect(
    archived.status === 200 && archived.json?.payload?.status === "archived",
    "DELETE /api/products/{id} → 200 status=archived",
    `got ${archived.status}`,
  );

  const afterArchive = await request(`/api/products/${createdProduct?.id}`);
  expect(
    afterArchive.status === 404,
    "  GET /api/products/{id} → 404 once archived (the row is gone from the API)",
    `got ${afterArchive.status}`,
  );

  // Cleanup, in dependency order. 404/409 means an earlier step already removed the row.
  for (const [what, path] of cleanup) {
    if (what === "product") continue; // archived above
    const removed = await request(path, { method: "DELETE", token });
    if (![200, 204, 404].includes(removed.status)) {
      fail(`cleanup DELETE ${path}`, `got ${removed.status}`);
    }
  }
  const categoryRemoved = createdCategory?.id
    ? await request(`/api/categories/${createdCategory.id}`, { method: "DELETE", token })
    : null;
  if (categoryRemoved && ![200, 204, 404].includes(categoryRemoved.status)) {
    fail("cleanup DELETE the smoke category", `got ${categoryRemoved.status}`);
  }

  // 5d. Customer account — register, profile, password recovery and the address book.
  //
  // All of it runs through `/api/me/*` and `/api/auth/*` with a *customer* token (zero permissions,
  // no roles), which is the point: these endpoints are session-scoped, not permission-scoped.
  const customerSuffix = `${suffix}-cust`;
  const customerEmail = `${customerSuffix}@example.com`;
  const customerUsername = customerSuffix;
  const customerUserIds = [];

  const registered = await request("/api/auth/register", {
    method: "POST",
    body: {
      first_name: "Smoke",
      last_name: "Customer",
      email: customerEmail,
      username: customerUsername,
      password: "Secret123",
    },
  });
  const registeredCustomer = registered.json?.payload;
  expect(
    registered.status === 200 && registeredCustomer?.is_active === true,
    "POST /api/auth/register → 200, account active immediately",
    `got ${registered.status} / is_active=${registeredCustomer?.is_active}`,
  );
  if (registeredCustomer?.id) customerUserIds.push(registeredCustomer.id);

  const duplicateEmail = await request("/api/auth/register", {
    method: "POST",
    body: {
      first_name: "Smoke",
      last_name: "Customer",
      email: customerEmail,
      username: `${customerUsername}-2`,
      password: "Secret123",
    },
  });
  expect(
    duplicateEmail.status === 409 && duplicateEmail.json?.payload?.error_code === "CONFLICT",
    "  duplicate email → 409 CONFLICT (the message names the value)",
    `got ${duplicateEmail.status}`,
  );

  const shortPassword = await request("/api/auth/register", {
    method: "POST",
    body: {
      first_name: "Smoke",
      last_name: "Customer",
      email: `short-${customerSuffix}@example.com`,
      username: `${customerUsername}-3`,
      password: "short",
    },
  });
  expect(
    shortPassword.status === 422 && shortPassword.json?.payload?.details?.field === "password",
    "  password shorter than 8 characters → 422 field=password",
    `got ${shortPassword.status}`,
  );

  const customerLogin = await request("/api/auth/login", {
    method: "POST",
    body: { username: customerUsername, password: "Secret123" },
  });
  const customerToken = customerLogin.json?.payload?.token;
  expect(
    customerLogin.status === 200 && Boolean(customerToken),
    "  the fresh customer can sign in (the admin endpoint's account would still be inactive)",
    `got ${customerLogin.status}`,
  );
  expect(
    (customerLogin.json?.payload?.permissions ?? []).length === 0,
    "  a self-registered account carries no permissions",
    `${customerLogin.json?.payload?.permissions?.length ?? 0} permissions`,
  );

  const emptyProfile = await request("/api/auth/me", { method: "PUT", token: customerToken, body: {} });
  expect(
    emptyProfile.status === 422 && emptyProfile.json?.payload?.details?.field === "profile",
    "PUT /api/auth/me {} → 422 field=profile (the API refuses an empty update)",
    `got ${emptyProfile.status}`,
  );

  const renamedProfile = await request("/api/auth/me", {
    method: "PUT",
    token: customerToken,
    body: { first_name: "Renamed" },
  });
  expect(
    renamedProfile.status === 200 &&
      renamedProfile.json?.payload?.first_name === "Renamed" &&
      renamedProfile.json?.payload?.username === customerUsername,
    "PUT /api/auth/me {first_name} → 200, other fields preserved",
    `got ${renamedProfile.status}`,
  );

  const recovery = await request("/api/auth/recovery/request", {
    method: "POST",
    body: { email: customerEmail },
  });
  const resetToken = recovery.json?.payload?.reset_token;
  expect(
    recovery.status === 200 && recovery.json?.payload?.accepted === true && Boolean(resetToken),
    "POST /api/auth/recovery/request → 200 with a reset token",
    `got ${recovery.status}`,
  );

  const unknownRecovery = await request("/api/auth/recovery/request", {
    method: "POST",
    body: { email: `nobody-${customerSuffix}@example.com` },
  });
  expect(
    unknownRecovery.status === 200 &&
      unknownRecovery.json?.payload?.accepted === true &&
      unknownRecovery.json?.payload?.reset_token === null,
    "  an unknown email is answered identically but without a token (no enumeration)",
    `got ${unknownRecovery.status}`,
  );

  const badToken = await request("/api/auth/recovery/reset", {
    method: "POST",
    body: { token: "not-a-token", new_password: "NewSecret1" },
  });
  expect(
    badToken.status === 401 && badToken.json?.payload?.error_code === "CREDENTIALS_VALIDATION_ERROR",
    "POST /api/auth/recovery/reset (bad token) → 401",
    `got ${badToken.status}`,
  );

  const reset = await request("/api/auth/recovery/reset", {
    method: "POST",
    body: { token: resetToken, new_password: "NewSecret1" },
  });
  expect(reset.status === 200, "POST /api/auth/recovery/reset → 200 (payload null)", `got ${reset.status}`);

  const replayed = await request("/api/auth/recovery/reset", {
    method: "POST",
    body: { token: resetToken, new_password: "NewSecret1" },
  });
  expect(replayed.status === 401, "  the same token cannot be replayed", `got ${replayed.status}`);

  const oldPassword = await request("/api/auth/login", {
    method: "POST",
    body: { username: customerUsername, password: "Secret123" },
  });
  expect(oldPassword.status === 401, "  the old password stops working", `got ${oldPassword.status}`);

  const newPassword = await request("/api/auth/login", {
    method: "POST",
    body: { username: customerUsername, password: "NewSecret1" },
  });
  const newCustomerToken = newPassword.json?.payload?.token;
  expect(
    newPassword.status === 200 && Boolean(newCustomerToken),
    "  the new password works",
    `got ${newPassword.status}`,
  );

  const address = {
    label: "Home",
    recipient_name: "Smoke Customer",
    phone: "+15550001",
    country: "US",
    city: "Boston",
    address_line1: "1 Beacon St",
    postal_code: "02108",
  };

  const firstAddress = await request("/api/me/addresses/", {
    method: "POST",
    token: newCustomerToken,
    body: address,
  });
  const firstAddressId = firstAddress.json?.payload?.id;
  expect(
    firstAddress.status === 200 && firstAddress.json?.payload?.is_default === true,
    "POST /api/me/addresses/ → 200 and the first address is forced default",
    `got ${firstAddress.status} / is_default=${firstAddress.json?.payload?.is_default}`,
  );

  const secondAddress = await request("/api/me/addresses/", {
    method: "POST",
    token: newCustomerToken,
    body: { ...address, label: "Office", is_default: false },
  });
  const secondAddressId = secondAddress.json?.payload?.id;
  expect(
    secondAddress.status === 200 && secondAddress.json?.payload?.is_default === false,
    "  a second address keeps is_default false",
    `got ${secondAddress.status}`,
  );

  const blankLabel = await request("/api/me/addresses/", {
    method: "POST",
    token: newCustomerToken,
    body: { ...address, label: "   " },
  });
  expect(
    blankLabel.status === 422 && Array.isArray(blankLabel.json?.detail),
    "  a blank label → FastAPI 422 (the DTO validator, not the envelope)",
    `got ${blankLabel.status}`,
  );

  const addressPage = await request("/api/me/addresses/?page=1&size=10", { token: newCustomerToken });
  expect(
    addressPage.status === 200 &&
      addressPage.json?.payload?.total === 2 &&
      Array.isArray(addressPage.json?.payload?.items),
    "GET /api/me/addresses/?page=1&size=10 → 200 paginated",
    `got ${addressPage.status} / total=${addressPage.json?.payload?.total}`,
  );

  const oversized = await request("/api/me/addresses/?page=1&size=101", { token: newCustomerToken });
  expect(
    oversized.status === 422 && Array.isArray(oversized.json?.detail),
    "  size=101 → FastAPI 422 (fastapi_pagination bounds size to 100)",
    `got ${oversized.status}`,
  );

  const renamedAddress = await request(`/api/me/addresses/${secondAddressId}`, {
    method: "PUT",
    token: newCustomerToken,
    body: { city: "Cambridge" },
  });
  expect(
    renamedAddress.status === 200 &&
      renamedAddress.json?.payload?.city === "Cambridge" &&
      renamedAddress.json?.payload?.label === "Office",
    "PUT /api/me/addresses/{id} → partial update keeps the other fields",
    `got ${renamedAddress.status}`,
  );

  const promoted = await request(`/api/me/addresses/${secondAddressId}`, {
    method: "PUT",
    token: newCustomerToken,
    body: { is_default: true },
  });
  const afterPromotion = await request("/api/me/addresses/?page=1&size=10", { token: newCustomerToken });
  const defaults = (afterPromotion.json?.payload?.items ?? []).filter((item) => item.is_default);
  expect(
    promoted.status === 200 && defaults.length === 1 && defaults[0].id === secondAddressId,
    "  is_default:true clears the flag on the other addresses",
    `${defaults.length} default(s)`,
  );

  // Cross-account isolation: the same address answers 404 for a different customer.
  const otherCustomer = await request("/api/auth/register", {
    method: "POST",
    body: {
      first_name: "Other",
      last_name: "Customer",
      email: `other-${customerSuffix}@example.com`,
      username: `other-${customerUsername}`,
      password: "Secret123",
    },
  });
  if (otherCustomer.json?.payload?.id) customerUserIds.push(otherCustomer.json.payload.id);
  const otherLogin = await request("/api/auth/login", {
    method: "POST",
    body: { username: `other-${customerUsername}`, password: "Secret123" },
  });
  const otherToken = otherLogin.json?.payload?.token;
  const foreignRead = await request(`/api/me/addresses/${firstAddressId}`, { token: otherToken });
  const foreignDelete = await request(`/api/me/addresses/${firstAddressId}`, {
    method: "DELETE",
    token: otherToken,
  });
  expect(
    foreignRead.status === 404 && foreignDelete.status === 404,
    "  another customer's address answers 404 for GET and DELETE",
    `got ${foreignRead.status} / ${foreignDelete.status}`,
  );

  const deletedFirst = await request(`/api/me/addresses/${firstAddressId}`, {
    method: "DELETE",
    token: newCustomerToken,
  });
  const deletedSecond = await request(`/api/me/addresses/${secondAddressId}`, {
    method: "DELETE",
    token: newCustomerToken,
  });
  const emptied = await request("/api/me/addresses/?page=1&size=10", { token: newCustomerToken });
  expect(
    deletedFirst.status === 200 && deletedSecond.status === 200 && emptied.json?.payload?.total === 0,
    "DELETE /api/me/addresses/{id} → 200, book emptied",
    `got ${deletedFirst.status} / ${deletedSecond.status} / total=${emptied.json?.payload?.total}`,
  );

  for (const userId of customerUserIds) {
    const removed = await request(`/api/users/${userId}`, { method: "DELETE", token });
    if (removed.status !== 200 && removed.status !== 204) {
      fail("cleanup DELETE the smoke customer", `got ${removed.status}`);
    }
  }

  // 5f. Commerce — cart → checkout → payment → fulfilment — the lifecycle the new screens drive.
  //
  // Every cart/checkout/payment call here is **anonymous** (the storefront's guest path); only the
  // back-office transitions carry a token. The section deliberately mirrors the sequence a browser
  // performs, in order, because the interesting failures are the ones that only appear between steps:
  // stock moving reserved → committed, the order appearing in `/api/me/orders/` only after it is
  // associated with an account, and every transition guard answering `422 field=status`.
  const commerceSuffix = `smoke-${suffix}-commerce`;
  const commerceCleanup = [];
  const commerceCategoryCleanup = [];
  const commerceUserIds = [];
  const ordersToCancel = [];

  // Two accounts of its own: the ones from 5d are removed at the end of that section (and a deleted
  // user's token stops being usable), and this section needs two live customers to prove that one
  // cannot read or cancel the other's order.
  const commerceCustomer = `${commerceSuffix}-buyer`;
  const commerceOther = `${commerceSuffix}-other`;
  for (const username of [commerceCustomer, commerceOther]) {
    const created = await request("/api/auth/register", {
      method: "POST",
      body: {
        first_name: "Smoke",
        last_name: "Buyer",
        email: `${username}@example.com`,
        username,
        password: "Secret123",
      },
    });
    if (created.json?.payload?.id) commerceUserIds.push(created.json.payload.id);
  }
  const commerceCustomerLogin = await request("/api/auth/login", {
    method: "POST",
    body: { username: commerceCustomer, password: "Secret123" },
  });
  const commerceCustomerToken = commerceCustomerLogin.json?.payload?.token;
  const commerceOtherLogin = await request("/api/auth/login", {
    method: "POST",
    body: { username: commerceOther, password: "Secret123" },
  });
  const commerceOtherToken = commerceOtherLogin.json?.payload?.token;
  expect(
    Boolean(commerceCustomerToken) && Boolean(commerceOtherToken),
    "setup: two customers with sessions (cart and orders are anonymous / session-scoped, not permission-scoped)",
    `buyer=${commerceCustomerLogin.status} other=${commerceOtherLogin.status}`,
  );

  const commerceCategory = await request("/api/categories/", {
    method: "POST",
    token,
    body: { name: `Smoke commerce ${suffix}`, slug: `${commerceSuffix}-category`, parent_id: null },
  });
  const commerceCategoryId = commerceCategory.json?.payload?.id;
  if (commerceCategoryId) {
    commerceCategoryCleanup.push(["category", `/api/categories/${commerceCategoryId}`]);
  }

  const commerceProduct = await request("/api/products/", {
    method: "POST",
    token,
    body: {
      title: `Smoke commerce ${suffix}`,
      slug: `${commerceSuffix}-product`,
      category_id: commerceCategoryId,
      brand_id: null,
    },
  });
  const commerceProductId = commerceProduct.json?.payload?.id;
  if (commerceProductId) {
    commerceCleanup.push(["product", `/api/products/${commerceProductId}`]);
  }
  const commerceSku = await request(`/api/products/${commerceProductId}/skus/`, {
    method: "POST",
    token,
    body: { code: `${commerceSuffix}-sku`, price_cents: 2599, stock_quantity: 5 },
  });
  const commerceSkuId = commerceSku.json?.payload?.id;
  if (commerceSkuId) {
    commerceCleanup.push(["sku", `/api/products/${commerceProductId}/skus/${commerceSkuId}`]);
  }
  // Publishing has three gates (follow-up #13's neighbours): an active SKU, a gallery, and valid
  // attribute values. The image is the file uploaded in 5c — the storefront cannot *render* it
  // (anonymous downloads are 401, follow-up #15) but the product is still sellable.
  const commerceGallery = await request(`/api/products/${commerceProductId}`, {
    method: "PUT",
    token,
    body: { gallery: [uploadedFile?.id] },
  });
  expect(
    commerceGallery.status === 200,
    "setup: the product gets a primary image (the publish gate reads the gallery)",
    `got ${commerceGallery.status}`,
  );

  const commercePublished = await request(`/api/products/${commerceProductId}/publish`, {
    method: "POST",
    token,
    body: {},
  });
  expect(
    commercePublished.status === 200 &&
      commercePublished.json?.payload?.status === "published" &&
      Boolean(commerceSkuId),
    "setup: a published product with one stocked SKU (2599, 5 in stock)",
    `got ${commercePublished.status}`,
  );

  // The cart starts empty and is created anonymously — no session, no cookie, nothing to leak.
  const cart = await request("/api/carts/", { method: "POST", body: {} });
  const cartId = cart.json?.payload?.id;
  expect(
    cart.status === 200 && Boolean(cartId) && (cart.json?.payload?.lines ?? []).length === 0,
    "POST /api/carts/ (anonymous) → 200 with an empty cart",
    `got ${cart.status}`,
  );

  const added = await request(`/api/carts/${cartId}/lines/`, {
    method: "POST",
    body: { sku_id: commerceSkuId, quantity: 2 },
  });
  expect(
    added.status === 200 &&
      added.json?.payload?.lines?.length === 1 &&
      added.json?.payload?.total_price_cents === 5198,
    "POST /api/carts/{id}/lines/ → 200, line price computed by the API (2 × 2599)",
    `got ${added.status} / total=${added.json?.payload?.total_price_cents}`,
  );
  const lineId = added.json?.payload?.lines?.[0]?.id;

  // The same SKU merges into the existing line instead of creating a second one.
  const merged = await request(`/api/carts/${cartId}/lines/`, {
    method: "POST",
    body: { sku_id: commerceSkuId, quantity: 1 },
  });
  expect(
    merged.status === 200 &&
      merged.json?.payload?.lines?.length === 1 &&
      merged.json?.payload?.lines?.[0]?.quantity === 3,
    "  adding the same SKU merges into one line (quantity 3)",
    `lines=${merged.json?.payload?.lines?.length} qty=${merged.json?.payload?.lines?.[0]?.quantity}`,
  );

  const tooMany = await request(`/api/carts/${cartId}/lines/`, {
    method: "POST",
    body: { sku_id: commerceSkuId, quantity: 99 },
  });
  const zeroQuantity = await request(`/api/carts/${cartId}/lines/`, {
    method: "POST",
    body: { sku_id: commerceSkuId, quantity: 0 },
  });
  expect(
    tooMany.status === 422 &&
      tooMany.json?.payload?.details?.field === "quantity" &&
      zeroQuantity.status === 422,
    "  quantity 99 / quantity 0 → 422 field=quantity (the line total is checked against stock)",
    `${tooMany.status} / ${zeroQuantity.status}`,
  );

  const unknownSku = await request(`/api/carts/${cartId}/lines/`, {
    method: "POST",
    body: { sku_id: "00000000-0000-4000-8000-000000000000", quantity: 1 },
  });
  expect(
    unknownSku.status === 404 && unknownSku.json?.payload?.error_code === "RESOURCE_NOT_FOUND",
    "  an unknown SKU → 404 RESOURCE_NOT_FOUND",
    `got ${unknownSku.status}`,
  );

  const updatedLine = await request(`/api/carts/${cartId}/lines/${lineId}`, {
    method: "PUT",
    body: { quantity: 2 },
  });
  expect(
    updatedLine.status === 200 && updatedLine.json?.payload?.lines?.[0]?.quantity === 2,
    "PUT /api/carts/{id}/lines/{line_id} → 200, quantity lowered",
    `got ${updatedLine.status}`,
  );

  // Delivery is a lookup, not a table: only the cities the backend has prices for answer.
  const missingCity = await request("/api/delivery/options");
  const tehran = await request("/api/delivery/options?city=Tehran");
  const tehranOptions = tehran.json?.payload ?? [];
  const berlin = await request("/api/delivery/options?city=Berlin");
  expect(
    missingCity.status === 422 && tehran.status === 200 && tehranOptions.length === 2,
    "GET /api/delivery/options?city=Tehran (anonymous) → 200 with two methods",
    `no-city=${missingCity.status} / Tehran=${tehranOptions.length}`,
  );
  expect(
    tehranOptions.map((option) => `${option.method}:${option.fee_cents}`).join(",") ===
      "standard:500,express:1000",
    "  standard 500 / express 1000 — the fees the checkout adds to the subtotal",
    tehranOptions.map((option) => `${option.method}:${option.fee_cents}`).join(","),
  );
  expect(
    berlin.status === 422 && berlin.json?.payload?.details?.field === "city",
    "  an undeliverable city (Berlin) → 422 field=city",
    `got ${berlin.status} / field=${berlin.json?.payload?.details?.field}`,
  );

  const checkoutScaffold = {
    contact_name: "Smoke Guest",
    contact_email: `${commerceCustomer}@example.com`,
    contact_phone: null,
    city: "Tehran",
    address_line1: "Valiasr 1",
    postal_code: "1234567890",
    delivery_method: "standard",
  };
  const unknownCartCheckout = await request("/api/checkouts/", {
    method: "POST",
    body: { ...checkoutScaffold, cart_id: "00000000-0000-4000-8000-000000000000" },
  });
  expect(
    unknownCartCheckout.status === 404 &&
      unknownCartCheckout.json?.payload?.error_code === "RESOURCE_NOT_FOUND",
    "POST /api/checkouts/ (unknown cart) → 404 RESOURCE_NOT_FOUND",
    `got ${unknownCartCheckout.status}`,
  );

  const emptyCart = await request("/api/carts/", { method: "POST", body: {} });
  const emptyCartCheckout = await request("/api/checkouts/", {
    method: "POST",
    body: { ...checkoutScaffold, cart_id: emptyCart.json?.payload?.id },
  });
  expect(
    emptyCartCheckout.status === 422 && emptyCartCheckout.json?.payload?.details?.field === "cart_id",
    "  a real but empty cart → 422 field=cart_id",
    `got ${emptyCartCheckout.status} / field=${emptyCartCheckout.json?.payload?.details?.field}`,
  );

  const checkoutBody = { ...checkoutScaffold, cart_id: cartId, delivery_method: "express" };
  const checkout = await request("/api/checkouts/", { method: "POST", body: checkoutBody });
  const order = checkout.json?.payload;
  expect(
    checkout.status === 200 &&
      order?.status === "awaiting_payment" &&
      order?.subtotal_cents === 5198 &&
      order?.delivery_fee_cents === 1000 &&
      order?.total_cents === 6198,
    "POST /api/checkouts/ (anonymous) → 200 awaiting_payment, subtotal + fee = total",
    `got ${checkout.status} / total=${order?.total_cents}`,
  );
  expect(
    typeof order?.guest_access_token === "string" && order.guest_access_token.length === 43,
    "  a 43-character guest_access_token is issued (the link that replaces a session)",
    `len=${order?.guest_access_token?.length}`,
  );
  expect(
    typeof order?.payment_expires_at === "string" && order?.customer_id === null,
    "  payment_expires_at is set and customer_id stays null even though an admin is signed in",
    `customer_id=${order?.customer_id}`,
  );
  const orderId = order?.id;
  const guestToken = order.guest_access_token;
  if (orderId) ordersToCancel.push(orderId);

  const anonymousRead = await request(`/api/orders/${orderId}`);
  const wrongToken = await request(`/api/orders/${orderId}?guest_access_token=wrong`);
  const tokenRead = await request(
    `/api/orders/${orderId}?guest_access_token=${encodeURIComponent(guestToken)}`,
  );
  expect(
    anonymousRead.status === 422 && wrongToken.status === 404 && tokenRead.status === 200,
    "GET /api/orders/{id} — no token → 422, wrong token → 404, the token → 200",
    `${anonymousRead.status} / ${wrongToken.status} / ${tokenRead.status}`,
  );

  // Reserved, not committed: the SKU's own counters are the proof.
  const reservedSku = await request(`/api/products/${commerceProductId}/skus/${commerceSkuId}`, { token });
  expect(
    reservedSku.json?.payload?.stock_quantity === 5 &&
      reservedSku.json?.payload?.reserved_quantity === 2 &&
      reservedSku.json?.payload?.available_quantity === 3,
    "  checkout reserved the stock: quantity 5 stays the total, reserved 2, available 3",
    `qty=${reservedSku.json?.payload?.stock_quantity} reserved=${reservedSku.json?.payload?.reserved_quantity} available=${reservedSku.json?.payload?.available_quantity}`,
  );

  // The cart is **not** touched by the checkout, and the order is keyed by it: as long as an
  // awaiting_payment order exists for this cart, every later checkout returns that same order,
  // whatever the shopper has added since. The client therefore drops its stored cart id on success
  // (checkout/CheckoutForm.tsx) — there is no DELETE on carts to clean up with (follow-up #18).
  const cartAfterCheckout = await request(`/api/carts/${cartId}`);
  const cartWasEdited = await request(`/api/carts/${cartId}/lines/`, {
    method: "POST",
    body: { sku_id: commerceSkuId, quantity: 1 },
  });
  const recheckout = await request("/api/checkouts/", { method: "POST", body: checkoutBody });
  expect(
    cartAfterCheckout.json?.payload?.lines?.length === 1,
    "  the checkout leaves the cart alone (the lines are still there)",
    `lines=${cartAfterCheckout.json?.payload?.lines?.length}`,
  );
  expect(
    cartWasEdited.status === 200 &&
      recheckout.json?.payload?.id === orderId &&
      recheckout.json?.payload?.total_cents === order?.total_cents,
    "  re-checkout of the same cart returns the same, unchanged order — the added line is ignored",
    `same=${recheckout.json?.payload?.id === orderId} total=${recheckout.json?.payload?.total_cents}`,
  );

  // One attempt per order: the second call answers with the same attempt, not a new row.
  const attempt = await request(`/api/orders/${orderId}/payment-attempts/`, {
    method: "POST",
    body: { guest_access_token: guestToken },
  });
  const attemptId = attempt.json?.payload?.id;
  const secondAttempt = await request(`/api/orders/${orderId}/payment-attempts/`, {
    method: "POST",
    body: { guest_access_token: guestToken },
  });
  expect(
    attempt.status === 200 &&
      attempt.json?.payload?.status === "pending" &&
      attempt.json?.payload?.amount_cents === 6198 &&
      attempt.json?.payload?.provider === "mock",
    "POST /api/orders/{id}/payment-attempts/ → 200 pending, for the order's full total",
    `got ${attempt.status} / amount=${attempt.json?.payload?.amount_cents}`,
  );
  expect(
    secondAttempt.json?.payload?.id === attemptId,
    "  a second POST returns the same attempt (one attempt per order)",
    `${secondAttempt.json?.payload?.id === attemptId ? "same" : "different"} id`,
  );

  const attemptsWithoutToken = await request(`/api/orders/${orderId}/payment-attempts/`);
  const attemptsList = await request(
    `/api/orders/${orderId}/payment-attempts/?guest_access_token=${encodeURIComponent(guestToken)}`,
  );
  const attemptById = await request(
    `/api/orders/${orderId}/payment-attempts/${attemptId}?guest_access_token=${encodeURIComponent(guestToken)}`,
  );
  expect(
    attemptsWithoutToken.status === 422 && attemptsList.status === 200 && attemptsList.json?.payload?.total === 1,
    "GET /api/orders/{id}/payment-attempts/ → 422 without the token, 200 {items,total} with it",
    `${attemptsWithoutToken.status} / ${attemptsList.status} / total=${attemptsList.json?.payload?.total}`,
  );
  expect(
    attemptById.status === 200 && attemptById.json?.payload?.id === attemptId,
    "  the same token reads a single attempt by id",
    `got ${attemptById.status}`,
  );

  const wrongAmount = await request(`/api/payment-attempts/${attemptId}/verify`, {
    method: "POST",
    body: { order_id: orderId, amount_cents: 1, outcome: "succeeded" },
  });
  expect(
    wrongAmount.status === 422 && wrongAmount.json?.payload?.details?.field === "amount_cents",
    "POST /api/payment-attempts/{id}/verify (wrong amount) → 422 field=amount_cents",
    `got ${wrongAmount.status} / field=${wrongAmount.json?.payload?.details?.field}`,
  );

  const failedVerification = await request(`/api/payment-attempts/${attemptId}/verify`, {
    method: "POST",
    body: {
      order_id: orderId,
      amount_cents: order?.total_cents,
      outcome: "failed",
      failure_reason: "smoke test decline",
    },
  });
  expect(
    failedVerification.status === 200 &&
      failedVerification.json?.payload?.attempt?.status === "failed" &&
      failedVerification.json?.payload?.attempt?.failure_reason === "smoke test decline" &&
      failedVerification.json?.payload?.order?.status === "awaiting_payment",
    "  outcome=failed → 200 {attempt,order}, the order stays awaiting_payment (a decline is not a dead end)",
    `got ${failedVerification.status} / attempt=${failedVerification.json?.payload?.attempt?.status} order=${failedVerification.json?.payload?.order?.status}`,
  );

  const stillAwaiting = await request(
    `/api/orders/${orderId}?guest_access_token=${encodeURIComponent(guestToken)}`,
  );
  expect(
    stillAwaiting.json?.payload?.status === "awaiting_payment",
    "  the order is still payable after a failed attempt",
    `status=${stillAwaiting.json?.payload?.status}`,
  );

  const reverifiedFailed = await request(`/api/payment-attempts/${attemptId}/verify`, {
    method: "POST",
    body: { order_id: orderId, amount_cents: order?.total_cents, outcome: "succeeded" },
  });
  expect(
    reverifiedFailed.status === 422 && reverifiedFailed.json?.payload?.details?.field === "attempt_id",
    "  a failed attempt cannot be re-verified → 422 field=attempt_id (retry means a new attempt)",
    `got ${reverifiedFailed.status} / field=${reverifiedFailed.json?.payload?.details?.field}`,
  );

  // A second attempt is minted only because the first one is no longer pending — the POST is
  // idempotent *per pending attempt*, not per order.
  const retry = await request(`/api/orders/${orderId}/payment-attempts/`, {
    method: "POST",
    body: { guest_access_token: guestToken },
  });
  const retryAttemptId = retry.json?.payload?.id;
  expect(
    retry.status === 200 && retryAttemptId !== attemptId,
    "  starting a payment after a decline → a new attempt (the failed one cannot be reused)",
    `${retryAttemptId === attemptId ? "same" : "new"} attempt`,
  );

  const succeeded = await request(`/api/payment-attempts/${retryAttemptId}/verify`, {
    method: "POST",
    body: {
      order_id: orderId,
      amount_cents: order?.total_cents,
      outcome: "succeeded",
      provider_reference: `SMOKE-${suffix}`,
    },
  });
  expect(
    succeeded.status === 200 &&
      succeeded.json?.payload?.attempt?.status === "succeeded" &&
      succeeded.json?.payload?.attempt?.provider_reference === `SMOKE-${suffix}` &&
      succeeded.json?.payload?.order?.status === "paid",
    "  outcome=succeeded → 200 {attempt,order}, the order is paid",
    `got ${succeeded.status} / ref=${succeeded.json?.payload?.attempt?.provider_reference} order=${succeeded.json?.payload?.order?.status}`,
  );

  const paidOrder = await request(`/api/orders/${orderId}/admin`, { token });
  expect(
    paidOrder.json?.payload?.status === "paid",
    "GET /api/orders/{id}/admin → 200 paid (the callback is what moves the order)",
    `status=${paidOrder.json?.payload?.status}`,
  );

  const committedSku = await request(`/api/products/${commerceProductId}/skus/${commerceSkuId}`, { token });
  expect(
    committedSku.json?.payload?.reserved_quantity === 0 &&
      committedSku.json?.payload?.committed_quantity === 2 &&
      committedSku.json?.payload?.available_quantity === 3,
    "  the reservation became a commitment: reserved 0, committed 2, available 3",
    `reserved=${committedSku.json?.payload?.reserved_quantity} committed=${committedSku.json?.payload?.committed_quantity} available=${committedSku.json?.payload?.available_quantity}`,
  );

  // The confirmation message is generated by the payment, not by the UI.
  const messagesAfterPayment = await request(`/api/orders/${orderId}/messages/`, { token });
  const confirmation = (messagesAfterPayment.json?.payload?.items ?? []).find(
    (message) => message.kind === "order_confirmation",
  );
  expect(
    messagesAfterPayment.status === 200 && confirmation?.status === "sent",
    "GET /api/orders/{id}/messages/ → 200 with a sent order_confirmation",
    `got ${messagesAfterPayment.status} / status=${confirmation?.status}`,
  );

  // A customer sees nothing until the order is associated with their account.
  const mineBefore = await request("/api/me/orders/?page=1&size=10", { token: commerceCustomerToken });
  expect(
    mineBefore.status === 200 && mineBefore.json?.payload?.total === 0,
    "GET /api/me/orders/ → 200, the guest order is not in the book yet",
    `total=${mineBefore.json?.payload?.total}`,
  );

  // Claiming proves two things at once: you hold the access token **and** the order was placed for the
  // email on your account. Anything else is answered exactly like an order that does not exist.
  const foreignAssociation = await request("/api/me/orders/guest-associations/request", {
    method: "POST",
    token: commerceOtherToken,
    body: { order_id: orderId, guest_access_token: guestToken },
  });
  expect(
    foreignAssociation.status === 404,
    "POST /api/me/orders/guest-associations/request (valid token, different account's email) → 404",
    `got ${foreignAssociation.status}`,
  );

  const associationRequest = await request("/api/me/orders/guest-associations/request", {
    method: "POST",
    token: commerceCustomerToken,
    body: { order_id: orderId, guest_access_token: guestToken },
  });
  const associationToken = associationRequest.json?.payload?.verification_token;
  const associationConfirm = await request("/api/me/orders/guest-associations/confirm", {
    method: "POST",
    token: commerceCustomerToken,
    body: { verification_token: associationToken },
  });
  expect(
    associationRequest.status === 200 &&
      associationRequest.json?.payload?.accepted === true &&
      Boolean(associationToken),
    "POST /api/me/orders/guest-associations/request → 200 accepted with a verification token",
    `got ${associationRequest.status}`,
  );
  expect(
    associationConfirm.status === 200 && associationConfirm.json?.payload?.customer_id,
    "  …/confirm → 200, the order now belongs to the customer",
    `got ${associationConfirm.status}`,
  );

  const mineAfter = await request("/api/me/orders/?page=1&size=10", { token: commerceCustomerToken });
  const myOrderRead = await request(`/api/me/orders/${orderId}`, { token: commerceCustomerToken });
  expect(
    mineAfter.json?.payload?.total === 1 && myOrderRead.status === 200,
    "GET /api/me/orders/ (page shape {items,total,page,size,pages}) now lists it",
    `total=${mineAfter.json?.payload?.total} / read=${myOrderRead.status}`,
  );

  // Cross-account isolation is a 404, exactly like the address book.
  const foreignOrder = await request(`/api/me/orders/${orderId}`, { token: commerceOtherToken });
  const foreignCancel = await request(`/api/me/orders/${orderId}/cancel`, {
    method: "POST",
    token: commerceOtherToken,
    body: { reason: "not mine" },
  });
  expect(
    foreignOrder.status === 404 && foreignCancel.status === 404,
    "  another customer's order answers 404 for read and cancel (not 403)",
    `${foreignOrder.status} / ${foreignCancel.status}`,
  );

  // Back-office fulfilment: process → ship → deliver, each guarded by its own permission.
  const illegalDeliver = await request(`/api/orders/${orderId}/deliver`, { method: "POST", token });
  expect(
    illegalDeliver.status === 422 && illegalDeliver.json?.payload?.details?.field === "status",
    "POST /api/orders/{id}/deliver (from paid) → 422 field=status",
    `got ${illegalDeliver.status} / field=${illegalDeliver.json?.payload?.details?.field}`,
  );

  const processing = await request(`/api/orders/${orderId}/processing`, { method: "POST", token });
  const shipped = await request(`/api/orders/${orderId}/ship`, {
    method: "POST",
    token,
    body: { carrier: "Smoke Post", tracking_reference: `TRK-${suffix}` },
  });
  const delivered = await request(`/api/orders/${orderId}/deliver`, { method: "POST", token });
  expect(
    processing.json?.payload?.status === "processing" &&
      shipped.json?.payload?.status === "shipped" &&
      shipped.json?.payload?.carrier === "Smoke Post",
    "POST …/processing → …/ship → the order carries the carrier and tracking reference",
    `${processing.status}/${shipped.status} carrier=${shipped.json?.payload?.carrier}`,
  );
  expect(
    delivered.json?.payload?.status === "delivered" && Boolean(delivered.json?.payload?.delivered_at),
    "POST …/deliver → 200 delivered with delivered_at",
    `got ${delivered.status} / ${delivered.json?.payload?.status}`,
  );

  const messagesAfterShip = await request(`/api/orders/${orderId}/messages/`, { token });
  expect(
    (messagesAfterShip.json?.payload?.items ?? []).some(
      (message) => message.kind === "dispatch_notice" && message.status === "sent",
    ),
    "  shipping generated a sent dispatch_notice",
    `${(messagesAfterShip.json?.payload?.items ?? []).length} message(s)`,
  );

  const cancelDelivered = await request(`/api/orders/${orderId}/cancel`, {
    method: "POST",
    token,
    body: { reason: "too late" },
  });
  expect(
    cancelDelivered.status === 422 && cancelDelivered.json?.payload?.details?.field === "status",
    "POST /api/orders/{id}/cancel (delivered) → 422 field=status — dispatched orders are final",
    `got ${cancelDelivered.status}`,
  );

  // Refunds only exist for a cancelled order that was paid.
  const refundNotCancelled = await request(`/api/orders/${orderId}/refund`, {
    method: "POST",
    token,
    body: { refund_reference: `RF-${suffix}` },
  });
  expect(
    refundNotCancelled.status === 422,
    "POST /api/orders/{id}/refund (delivered) → 422 — a delivered order cannot be refunded",
    `got ${refundNotCancelled.status}`,
  );

  // A second order, cancelled from `awaiting_payment` — the guest does it themselves with the token.
  const secondCart = await request("/api/carts/", { method: "POST", body: {} });
  const secondCartId = secondCart.json?.payload?.id;
  await request(`/api/carts/${secondCartId}/lines/`, {
    method: "POST",
    body: { sku_id: commerceSkuId, quantity: 1 },
  });
  const guestCheckout = await request("/api/checkouts/", {
    method: "POST",
    body: { ...checkoutBody, cart_id: secondCartId, delivery_method: "standard" },
  });
  const guestOrder = guestCheckout.json?.payload;
  expect(
    guestCheckout.status === 200 &&
      guestOrder?.status === "awaiting_payment" &&
      guestOrder?.delivery_fee_cents === 500 &&
      guestOrder?.total_cents === 3099,
    "second order: standard delivery adds 500 (2599 + 500)",
    `got ${guestCheckout.status} / total=${guestOrder?.total_cents}`,
  );

  const guestCancelWrongToken = await request(`/api/orders/${guestOrder?.id}/guest-cancel`, {
    method: "POST",
    body: { guest_access_token: "wrong", reason: "nope" },
  });
  const guestCancel = await request(`/api/orders/${guestOrder?.id}/guest-cancel`, {
    method: "POST",
    body: {
      guest_access_token: guestOrder?.guest_access_token,
      reason: "smoke test cancellation",
    },
  });
  expect(
    guestCancelWrongToken.status === 404,
    "POST /api/orders/{id}/guest-cancel (wrong token) → 404",
    `got ${guestCancelWrongToken.status}`,
  );
  expect(
    guestCancel.status === 200 &&
      guestCancel.json?.payload?.status === "cancelled" &&
      guestCancel.json?.payload?.refund_required === false,
    "  the guest cancels their own unpaid order → cancelled, no refund required",
    `got ${guestCancel.status} / refund_required=${guestCancel.json?.payload?.refund_required}`,
  );

  const releasedSku = await request(`/api/products/${commerceProductId}/skus/${commerceSkuId}`, { token });
  expect(
    releasedSku.json?.payload?.reserved_quantity === 0,
    "  cancelling released the reservation (reserved 0)",
    `reserved=${releasedSku.json?.payload?.reserved_quantity}`,
  );

  const cancelledAgain = await request(`/api/orders/${guestOrder?.id}/guest-cancel`, {
    method: "POST",
    body: { guest_access_token: guestOrder?.guest_access_token, reason: "again" },
  });
  expect(
    cancelledAgain.status === 422 && cancelledAgain.json?.payload?.details?.field === "status",
    "  cancelling again → 422 field=status: owner cancellation exists only for awaiting_payment",
    `got ${cancelledAgain.status} / field=${cancelledAgain.json?.payload?.details?.field}`,
  );

  const cancelWithoutReason = await request(`/api/orders/${guestOrder?.id}/guest-cancel`, {
    method: "POST",
    body: { guest_access_token: guestOrder?.guest_access_token },
  });
  expect(
    cancelWithoutReason.status === 422 && Array.isArray(cancelWithoutReason.json?.detail),
    "  a missing reason → FastAPI {detail:[…]} (the DTO, not the envelope)",
    `got ${cancelWithoutReason.status}`,
  );

  // A third order: paid, then cancelled by the back office — this is where a refund becomes due.
  const thirdCart = await request("/api/carts/", { method: "POST", body: {} });
  const thirdCartId = thirdCart.json?.payload?.id;
  await request(`/api/carts/${thirdCartId}/lines/`, {
    method: "POST",
    body: { sku_id: commerceSkuId, quantity: 1 },
  });
  const thirdCheckout = await request("/api/checkouts/", {
    method: "POST",
    body: { ...checkoutBody, cart_id: thirdCartId },
  });
  const paidThenCancelled = thirdCheckout.json?.payload;
  if (paidThenCancelled?.id) ordersToCancel.push(paidThenCancelled.id);

  await request(`/api/orders/${paidThenCancelled?.id}/payment-attempts/`, {
    method: "POST",
    body: { guest_access_token: paidThenCancelled?.guest_access_token },
  });
  const thirdAttempts = await request(
    `/api/orders/${paidThenCancelled?.id}/payment-attempts/?guest_access_token=${encodeURIComponent(paidThenCancelled?.guest_access_token ?? "")}`,
  );
  const thirdAttemptId = thirdAttempts.json?.payload?.items?.[0]?.id;
  const thirdPaid = await request(`/api/payment-attempts/${thirdAttemptId}/verify`, {
    method: "POST",
    body: {
      order_id: paidThenCancelled?.id,
      amount_cents: paidThenCancelled?.total_cents,
      outcome: "succeeded",
      provider_reference: `SMOKE-${suffix}-3`,
    },
  });
  expect(
    thirdPaid.json?.payload?.order?.status === "paid",
    "third order: paid before the back office cancels it",
    `status=${thirdPaid.json?.payload?.order?.status}`,
  );

  const guestCancelPaid = await request(`/api/orders/${paidThenCancelled?.id}/guest-cancel`, {
    method: "POST",
    body: { guest_access_token: paidThenCancelled?.guest_access_token, reason: "mine" },
  });
  expect(
    guestCancelPaid.status === 422 && /unpaid orders/.test(guestCancelPaid.json?.message ?? ""),
    "  the owner cannot cancel a paid order → 422 'Only unpaid orders can be cancelled by their owner'",
    `got ${guestCancelPaid.status} / ${guestCancelPaid.json?.message}`,
  );

  const adminCancel = await request(`/api/orders/${paidThenCancelled?.id}/cancel`, {
    method: "POST",
    token,
    body: { reason: "smoke test cancellation" },
  });
  expect(
    adminCancel.status === 200 &&
      adminCancel.json?.payload?.status === "cancelled" &&
      adminCancel.json?.payload?.refund_required === true,
    "POST /api/orders/{id}/cancel on a paid order → 200 cancelled with refund_required true",
    `got ${adminCancel.status} / refund_required=${adminCancel.json?.payload?.refund_required}`,
  );

  const refund = await request(`/api/orders/${paidThenCancelled?.id}/refund`, {
    method: "POST",
    token,
    body: { refund_reference: `RF-${suffix}` },
  });
  expect(
    refund.status === 200 &&
      refund.json?.payload?.refund_reference === `RF-${suffix}` &&
      Boolean(refund.json?.payload?.refunded_at),
    "POST /api/orders/{id}/refund → 200 with the reference recorded",
    `got ${refund.status} / ref=${refund.json?.payload?.refund_reference}`,
  );

  const cancelAlreadyCancelled = await request(`/api/orders/${paidThenCancelled?.id}/cancel`, {
    method: "POST",
    token,
    body: { reason: "again" },
  });
  expect(
    cancelAlreadyCancelled.status === 200 &&
      cancelAlreadyCancelled.json?.payload?.status === "cancelled" &&
      cancelAlreadyCancelled.json?.payload?.refund_required === true,
    "  the back office cancelling an already-cancelled order is a no-op (200, refund still due)",
    `got ${cancelAlreadyCancelled.status}`,
  );

  const refundAgain = await request(`/api/orders/${paidThenCancelled?.id}/refund`, {
    method: "POST",
    token,
    body: { refund_reference: `RF-${suffix}` },
  });
  const refundDifferent = await request(`/api/orders/${paidThenCancelled?.id}/refund`, {
    method: "POST",
    token,
    body: { refund_reference: `RF-${suffix}-other` },
  });
  expect(
    refundAgain.status === 200 && refundDifferent.status === 422,
    "  the same reference is a no-op, a different one → 422 (money is never returned twice)",
    `${refundAgain.status} / ${refundDifferent.status}`,
  );

  const anonymousRefund = await request(`/api/orders/${paidThenCancelled?.id}/refund`, {
    method: "POST",
    body: { refund_reference: "nope" },
  });
  expect(
    anonymousRefund.status === 401,
    "  refund is permission-gated: 401 without a session (orders:refund)",
    `got ${anonymousRefund.status}`,
  );

  // RBAC: the four order permissions are what the back office is gated on.
  const customerOrders = await request("/api/orders/?page=1&size=10", { token: commerceCustomerToken });
  const anonymousOrders = await request("/api/orders/?page=1&size=10");
  const anonymousMessages = await request(`/api/orders/${orderId}/messages/`);
  expect(
    customerOrders.status === 403 &&
      customerOrders.json?.payload?.error_code === "FORBIDDEN" &&
      anonymousOrders.status === 401,
    "GET /api/orders/ → 401 anonymous, 403 FORBIDDEN for a customer without orders:read",
    `${anonymousOrders.status} / ${customerOrders.status}`,
  );
  expect(
    anonymousMessages.status === 401,
    "  the notification log is permission-gated too (401 anonymous)",
    `got ${anonymousMessages.status}`,
  );

  const orderSearch = await request(`/api/orders/?page=1&size=10&search=${encodeURIComponent(`SMOKE-${suffix}`)}`, {
    token,
  });
  const orderByStatus = await request("/api/orders/?page=1&size=10&status=paid", { token });
  expect(
    orderSearch.status === 200 && orderByStatus.status === 200,
    "GET /api/orders/?search= / ?status= → 200 (both filters are accepted)",
    `${orderSearch.status} / total=${orderSearch.json?.payload?.total} / paid=${orderByStatus.json?.payload?.total}`,
  );

  const adminRead = await request(`/api/orders/${orderId}/admin`, { token });
  const customerAdminRead = await request(`/api/orders/${orderId}/admin`, { token: commerceCustomerToken });
  expect(
    adminRead.status === 200 && customerAdminRead.status === 403,
    "GET /api/orders/{id}/admin needs orders:read (403 without it)",
    `${adminRead.status} / ${customerAdminRead.status}`,
  );

  // Cleanup: cancel whatever is still live so the SKU's stock returns, then archive the product.
  for (const id of ordersToCancel) {
    const current = await request(`/api/orders/${id}/admin`, { token });
    if (current.json?.payload?.status === "awaiting_payment" || current.json?.payload?.status === "paid") {
      await request(`/api/orders/${id}/cancel`, { method: "POST", token, body: { reason: "smoke cleanup" } });
    }
    if (current.json?.payload?.status === "cancelled" && current.json?.payload?.refund_required) {
      await request(`/api/orders/${id}/refund`, {
        method: "POST",
        token,
        body: { refund_reference: `RF-cleanup-${suffix}` },
      });
    }
  }
  for (const [what, path] of commerceCleanup) {
    const removed = await request(path, { method: "DELETE", token });
    if (![200, 204, 404].includes(removed.status)) {
      fail(`cleanup DELETE ${what} ${path}`, `got ${removed.status}`);
    }
  }
  for (const [what, path] of commerceCategoryCleanup) {
    const removed = await request(path, { method: "DELETE", token });
    if (![200, 204, 404].includes(removed.status)) {
      fail(`cleanup DELETE ${what} ${path}`, `got ${removed.status}`);
    }
  }
  for (const userId of commerceUserIds) {
    const removed = await request(`/api/users/${userId}`, { method: "DELETE", token });
    if (![200, 204, 404].includes(removed.status)) {
      fail("cleanup DELETE the commerce customer", `got ${removed.status}`);
    }
  }

  // 6. Unauthenticated access must stay a 401 envelope (this is what triggers a silent refresh).
  const anonymous = await request("/api/auth/me");
  expect(
    anonymous.status === 401 && anonymous.json?.success === false,
    "GET /api/auth/me (no token) → 401 envelope",
    `got ${anonymous.status}`,
  );

  // 7. Refresh rotates the access token using only the cookie.
  if (loginCookie) {
    const refreshed = await request("/api/auth/refresh", {
      method: "POST",
      cookie: loginCookie,
      body: {},
    });
    expect(
      refreshed.status === 200 && Boolean(refreshed.json?.payload?.token),
      "POST /api/auth/refresh (cookie only) → new access token",
      `got ${refreshed.status}`,
    );
  }

  // 8. Logout revokes the token and clears the cookie.
  const logout = await request("/api/auth/logout", {
    method: "POST",
    cookie: loginCookie ?? "",
    token,
  });
  expect(
    logout.status === 200 && logout.json?.success === true,
    "POST /api/auth/logout → 200",
    `got ${logout.status}`,
  );
  expect(
    logout.setCookies.some((cookie) => /refresh_token=;/.test(cookie) || /max-age=0/i.test(cookie)),
    "  refresh_token cookie cleared",
    JSON.stringify(logout.setCookies),
  );

  if (loginCookie) {
    const afterLogout = await request("/api/auth/refresh", {
      method: "POST",
      cookie: loginCookie,
      body: {},
    });
    expect(
      afterLogout.status === 401,
      "POST /api/auth/refresh (revoked cookie) → 401",
      `got ${afterLogout.status}`,
    );
  }

  // 9. Report the validation error shape the frontend normaliser has to absorb.
  const invalid = await request("/api/auth/login", {
    method: "POST",
    body: { username: USERNAME },
  });
  expect(invalid.status === 422, "POST /api/auth/login (missing field) → 422", `got ${invalid.status}`);
  console.log(
    dim(
      `    note: 422 body is ${invalid.json && "detail" in invalid.json ? "FastAPI's {detail:[...]} (normalised by lib/api-error.ts)" : "the standard envelope"}`,
    ),
  );

  console.log(
    `\n${failures === 0 ? green("All contract checks passed") : red(`${failures} of ${checks} checks failed`)} (${checks - failures}/${checks})\n`,
  );

  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(`\n${red("Smoke test crashed:")} ${error?.message ?? error}`);
  console.error(
    dim("Is the frontend dev server running (`pnpm dev`) and the backend up on the proxy target?\n"),
  );
  process.exit(1);
});
