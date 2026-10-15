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
