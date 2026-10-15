#!/usr/bin/env node
/**
 * End-to-end integration smoke test: browser-facing contract → Next.js proxy → FastAPI backend.
 *
 * It asserts the things that break first when the two projects drift apart: the response
 * envelope, the login/refresh/logout cookie lifecycle, the access-token flow, the RBAC payload, and
 * the pagination shape.
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
