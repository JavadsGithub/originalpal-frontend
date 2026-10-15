# Frontend ⇄ Backend Contract Audit

**Status:** complete for the read/plan phase — every claim below was verified against a **running** backend, not just read from source.
**Frontend:** `JavadsGithub/originalpal-frontend` @ `40fba70` (branch `arena/ab1cf647-originalpal-frontend`)
**Backend:** `JavadsGithub/originalpal-server-python` @ `3d82827bca55928d7ad540e025a1263ded3f72f5` (branch `master`)

## How this was verified

The backend was cloned, its runtime installed, its schema migrated, and it was booted locally:

```bash
# backend under test (this sandbox blocks the py3.12 toolchain download and PostgreSQL, so the
# pinned runtime deps were installed into a py3.11 venv — the code runs unchanged — and the
# portable schema (String(36) ids, sa.JSON) allowed SQLite instead of Postgres)
python -m venv .venv && .venv/bin/pip install fastapi==0.115.6 uvicorn pydantic-settings \
    "python-jose[cryptography]" loguru fastapi-pagination bcrypt python-multipart \
    "sqlalchemy[asyncio]" alembic aiosqlite
DATABASE_URL=sqlite+aiosqlite:///./originalpal.db
alembic upgrade head                                 # 19 revisions applied
uvicorn app.main:app --host 0.0.0.0 --port 8004      # live on :8004, seed admin `admin` / `Secret123`
```

`GET /api/ping`, `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/users/`, `GET /api/roles/`, `GET /api/auth/permissions`,
`POST /api/auth/refresh`, CORS preflights and the 422 path were all exercised with real HTTP calls. Evidence is quoted inline.

---

## 1. Verdict

| Area | Status before this session | After this session |
| --- | --- | --- |
| Response envelope (`StandardResponse`) | ✅ matches | ✅ typed + normalised |
| Access/refresh token flow | ✅ matches, ⚠️ fragile transport | ✅ same-origin proxy, single-flight refresh |
| Browser → API transport | ❌ **blocked** (CORS + sandbox preview) | ✅ fixed (Next.js same-origin proxy) |
| Error contract | ⚠️ unmodelled, two shapes | ✅ normalised `ApiError` |
| Pagination contract | ✅ matches (`items/total/page/size/pages`) | ✅ typed + documented |
| RBAC permission registry | ❌ **drifted** (19 vs 49, 3 dead ids) | ✅ generated from one source of truth |
| Domain coverage (114 backend operations) | ⚠️ 4 hooks | ⚠️ 5 hooks wired + roadmap below (§6) |
| Local dev / env / docs | ⚠️ template boilerplate | ✅ documented, scripted, verified |

---

## 2. Transport: the one thing that genuinely blocked integration

The frontend defaulted to **browser-direct** calls:

```ts
// lib/fetcher.ts (before)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8004/api";
```

That cannot work in the sandbox/Preview environment, and it is fragile everywhere else:

* The backend CORS allowlist is hardcoded (`app/infra/core/add_middlewares.py`) to four `localhost` origins.
  Live preflight evidence for a Preview-style origin:

  ```
  origin=http://localhost:3000     → 200, ACAO=http://localhost:3000, ACAC=true
  origin=https://3000-abc123.e2b.app → 400, ACAO=None
  simple GET with Origin: https://3000-... → no Access-Control-Allow-Origin header
  ```

  → every request from Preview (and any real deployment) is blocked by the browser.
* The browser inside the user's machine cannot reach `localhost:8004` **inside** the sandbox.
* The `refresh_token` cookie is `SameSite=strict` and must be written to the *frontend* origin to be first-party.

**Fix (implemented):** the browser now always talks to its **own origin** (`/api/...`), and the Next.js server proxies
`/api/*` to the backend. Consequences: CORS becomes irrelevant for the browser, the refresh cookie becomes
first-party, and `API_PROXY_TARGET` is the only thing that changes per environment. Direct mode is still available by
setting `NEXT_PUBLIC_API_URL` to an absolute URL (e.g. behind a same-site gateway).

```
Browser ──/api/*──► Next.js (same origin)  ──API_PROXY_TARGET──►  FastAPI :8004
                    ├─ app/api/<static>/route.ts wins if it exists (e.g. /api/health)
                    └─ app/api/[...path]/route.ts proxies everything else verbatim
                       (path incl. trailing slash, Set-Cookie, uploads, streams)
```

**Two traps found while building the proxy** (both invisible in code review, both caught by the smoke test):

1. **`rewrites()` does not preserve trailing slashes.** `/api/users/` was forwarded as `/api/users`, so the backend
   answered **307** — through the proxy, a "correct" URL became a redirect.
2. **The backend's `Location` header is absolute** (`http://127.0.0.1:8004/api/users/...`). Passed through, it sends
   the browser to an internal host it cannot reach (fatal in a sandbox, wrong in every deployment).

The fix is a streaming route handler (`app/api/[...path]/route.ts`) that forwards the path byte-for-byte, rewrites
backend-origin redirects into same-origin relative paths (now `location: /api/users/?page=1`), forwards each
`Set-Cookie` separately, and returns a `502 NETWORK_ERROR` envelope when the backend is down. Verified with
`curl -i` on both the slashed and unslashed forms.

---

## 3. Envelope & error contract

Success (live): identical to the frontend's `StandardResponse<T>`:

```json
{"success": true, "message": "pong", "payload": null}
{"success": true, "message": "Login successful",
 "payload": {"title": "access_token", "token": "<jwt>", "type": "bearer", "expires_at": "2026-10-15T18:26:54.211451Z"}}
```

Note `payload` is **`null`** for endpoints that only carry a message (`/api/ping`, `POST /api/auth/logout`). The
unwrapper must therefore treat "no payload" as success, not as a parse failure.

Domain failures **do** follow the envelope (live, `admin` + wrong password):

```json
HTTP 401
{"success": false, "message": "Incorrect username or password",
 "payload": {"error_code": "CREDENTIALS_VALIDATION_ERROR", "details": {}, "status_code": 401}}
```

⚠️ **But FastAPI's own request-validation errors escape the envelope** (live, login without `password`):

```json
HTTP 422
{"detail": [{"type": "missing", "loc": ["body", "password"], "msg": "Field required", "input": {"username": "admin"}}]}
```

So the frontend sees **two error shapes**. `lib/fetcher.ts` now normalises both into a single `ApiError`
(`status`, `errorCode`, `message`, `details`, `fieldErrors`), and `RequestValidationError` should ideally be given a
handler on the backend so `error_code: "VALIDATION_ERROR"` is used consistently (§8).

Complete `error_code` inventory (from `app/domain/error/exceptions.py`): `VALIDATION_ERROR` (422),
`RESOURCE_NOT_FOUND` (404), `UNAUTHORIZED` / `CREDENTIALS_VALIDATION_ERROR` / `INACTIVE_USER` (401),
`FORBIDDEN` (403), `CONFLICT` (409), `BUSINESS_ERROR` (400). Unhandled exceptions collapse to
`500 {"success": false, "message": "An internal server error occurred", "payload": {"code": 500}}` — note the payload
key there is `code`, not `error_code`/`details`, so the normaliser tolerates all three shapes.

---

## 4. Auth & session contract (live-verified)

| Step | Wire result | Frontend handling |
| --- | --- | --- |
| `POST /api/auth/login` `{username,password}` | `200`, payload = access token, `Set-Cookie: refresh_token=…; HttpOnly; Max-Age=604800; Path=/; SameSite=strict` (no `Secure`) | ✅ kept in memory, cookie untouched by JS |
| `GET /api/auth/me` (Bearer) | `200`, `User{id, first_name, last_name, email, username, is_active, created_at, updated_at, roles:[Role{…, permission_ids[]}]}` | ✅ types match exactly |
| `GET /api/auth/me` (no header) | `401 CREDENTIALS_VALIDATION_ERROR` | ✅ triggers refresh-or-logout |
| `POST /api/auth/refresh` (cookie only, empty body) | `200`, new access token | ✅ single-flight refresh queue |
| `POST /api/auth/logout` (cookie) | `200` + cookie deleted at `Path=/`; **`401` if the cookie is missing** | ✅ logout now treats 401 as "already logged out" |

Facts the frontend must respect:

* **401 vs 403 are different problems.** Missing/invalid token → `401`; authenticated but lacking the permission → `403 FORBIDDEN`.
  Only 401 should trigger a refresh + redirect to login; 403 must render "access denied" without dropping the session.
  Verified end-to-end with a real permission-less user (created via `POST /api/users/` + a role with no permissions):
  `GET /api/auth/me` → **200**, `GET /api/users/` → **403 FORBIDDEN**, and the client reported `isForbidden` without
  emitting a session-expiry event.
* **Newly created users cannot log in.** `POST /api/users/` (and `POST /api/auth/register`) leave the account inactive;
  logging in returns `401 INACTIVE_USER`. Reproduced while building the RBAC test — it required
  `PUT /api/users/{id}` with `{"is_active": true}` first. The admin user-management UI must expose activation, and
  customer self-registration needs an activation story before it can ship.
* Access tokens live 30 min (`ACCESS_TOKEN_EXPIRE_MINUTES=30`), refresh tokens 7 days (`REFRESH_TOKEN_EXPIRE_DAYS=7`).
* The access token is **memory-only** by design → every hard reload performs one silent `POST /api/auth/refresh`
  before `/api/auth/me`. That is expected traffic, not a bug; it is why the refresh call must never itself be retried into an infinite loop.
* The cookie is `secure=False` today. In production behind HTTPS it must be `true` (§8) — otherwise the browser refuses
  to store it on `https://` origins in some configurations and logout-after-reload breaks.
* `PUT /api/auth/me` (profile update) exists; `POST /api/auth/register`, `POST /api/auth/recovery/request`,
  `POST /api/auth/recovery/reset` exist for customer accounts. No UI yet (§6).
* `GET /api/auth/permissions` returns permission records **without** a `policies` field. The controller code that tries
  to inline policy objects is dead: `PermissionMapper.to_dto()` produces a DTO with no such field, so the loop always
  sees nothing (and the `response_model` would strip it anyway). Harmless, but don't build a policy UI on it yet.

---

## 5. RBAC: the permission registry had drifted (fixed)

`lib/permissions.ts` held **19** ids; the backend's `statics/permissions.json` and generated
`app/infra/utils/auth/permission.py` enum hold **49**. Three frontend ids exist nowhere in the backend
(`Test_CreateDefault`, `Item_Read`, `Item_Create` — template leftovers), and **33 real permissions were missing**:
`uploads:*`, `categories:*`, `attributes:*`, `category-attributes:*` (no `read` variant — those routes are guarded by
`products:*`/`super:user` semantics), `brands:*`, `products:*`, `products:publish|unpublish`, `skus:*`,
`attribute-values:*`, `orders:read|fulfill|cancel|refund`, `homepage:*`.

Effect before the fix: `Permissions.Super_User` was correct (so the super-user bypass worked), but every
`PermissionGate`/`AuthGuard` written for catalog, orders, or uploads would have evaluated against a missing id and
silently denied access.

**Fix:** `lib/permissions.ts` is now generated from the backend's own registry by
`scripts/sync-permissions.mjs` (checked-in snapshot at `statics/permissions.json`), using the same
`resource:action → Resource_Action` naming rule as the backend's `auth_manager.py`. Generated keys were diffed
against the backend's `Permission` enum: **49/49 names and values match.**

Reproduce / detect drift:

```bash
pnpm permissions:sync      # regenerate lib/permissions.ts from statics/permissions.json
pnpm permissions:check     # CI gate: fails if the file is stale
```

> The seeded database only grants `super:user` to the `Admin` role, so `admin` bypasses every specific check. To
> exercise real permission denial you must create a role with a narrower permission set (see `POST /api/roles/{id}/permissions`).

---

## 6. Pagination, path conventions, and coverage

* Paginated collections return `{items, total, page, size, pages}` inside `payload` — exactly the frontend's
  `PaginatedPayload<T>`. Live: `GET /api/roles/?page=1&size=10` → `{…,"total":1,"page":1,"size":10,"pages":1}`.
* Query params are `page` and `size` (`fastapi_pagination.Params`); backend default size is 10
  (`DEFAULT_PAGINATION_LIMIT`), no upper bound is enforced.
* **Trailing slashes are significant**: `GET /api/users` → **307** redirect, `GET /api/users/` → **200** (live-verified).
  Collection paths in the backend are declared as `"/"`, so hooks must call `/users/`, `/roles/`, `/products/`, … .
  Exceptions with no trailing slash: `/api/ping`, `/api/auth/*`, `/api/files`, `/api/upload`, `/api/delivery/options`,
  and the action-style routes (`/api/orders/{id}/ship`, …). `next.config.ts` sets `skipTrailingSlashRedirect` so the
  proxy preserves whatever the caller sent.
* 114 operations across 24 routers are exposed. Current frontend coverage:

| Backend area | Operations | Frontend hook |
| --- | --- | --- |
| `auth` (login/refresh/logout/me/permissions/register/recovery) | 9 | 3 (`login`, `me`, `logout`) |
| `users`, `roles` | 14 | 1 (users list) |
| catalog: `products`, `skus`, `categories`, `attributes`, `attribute-values`, `category-attributes`, `brands` | 41 | – |
| `public catalog`, `homepage`, `delivery` | 9 | – |
| `carts`, `checkouts`, `orders`, `order-messages`, `payment-attempts`, `me/orders`, `me/addresses` | 35 | – |
| `uploads` | 5 | – |
| `default` (`/ping`) | 1 | 1 (`useGetBackendHealth`) |

The `InvoicesTable` examples (`data/feature/invoice/*`, `components/feature/item/InvoicesTable/*`,
`app/examples/**`) are **mock-only showcases** of the component framework — the backend has no invoice
resource. They are kept as living documentation and should be replaced by real `orders`/`payment-attempts`
slices; nothing in the auth/RBAC path depends on them.

---

## 7. Tooling, env, and build readiness

| Issue found | Resolution |
| --- | --- |
| `.env.example` had 2 variables, no proxy target | rewritten (§`ENVIRONMENT.md`) |
| `orval.config.ts` hard-throws when `OPENAPI_JSON_URL` is unset — breaks `pnpm api:generate` out of the box | documented; `.env` template provided |
| `lib/api` is git-ignored → generated client can't be relied on for typecheck in a fresh clone | handwritten hooks remain the contract-bearing layer; orval stays an accelerator |
| No `typecheck` script; no reproducible install (pnpm lockfile + `pnpm-workspace.yaml` committed, but npm was the documented path) | `packageManager` pinned, scripts added, README rewritten |
| README was still `create-next-app` boilerplate | rewritten for the two-repo workflow |
| `/api/users` demo route handlers returned hardcoded fake users and would silently shadow the real API | removed |
| Next dev server needs to accept the sandbox Preview origin | `allowedDevOrigins` + `-H 0.0.0.0` |
| `next build` requires network access to Google Fonts (`app/layout.tsx` uses `next/font/google`) | documented; switch to `next/font/local` for offline builds |
| ESLint linted orval's generated output (500 KB+ files) | `lib/api/**` ignored |
| orval types generated callers as returning `StandardResponse[T]` while the mutator returns `payload` | documented in `orval.config.ts`; handwritten hooks stay the contract layer |

---

## 8. Backend-side items (not blocking, but they belong on the roadmap)

1. **CORS from configuration.** `allow_origins` is a hardcoded list. Even with the proxy in place, add
   `CORS_ORIGINS` (comma-separated) to `app/infra/core/config.py` and feed it from `.env` — needed the moment anyone
   calls the API directly from a deployed frontend.
2. **`RequestValidationError` is not enveloped** → two error shapes (§3). Register a handler that returns
   `422 VALIDATION_ERROR` with `details.errors`.
3. **`alembic/env.py` reads `os.environ["DATABASE_URL"]` directly**, ignoring the `.env` file that
   `pydantic-settings` loads → `make migrate` silently uses `alembic.ini`'s hardcoded Postgres URL
   (reproduced locally: `ModuleNotFoundError: asyncpg` while `.env` pointed elsewhere). Load the settings object instead.
4. **`fastapi-pagination>=0.15.3` warns on every boot**: *"FastAPI v0.128.0 or higher is required for full
   compatibility … Support for FastAPI versions lower than v0.128.0 will be dropped in v0.16.0"* while
   `fastapi==0.115.6` is pinned. Pin a compatible pair before pagination behaviour surprises the frontend.
5. **`secure` cookie flag** must be `True` in production (`auth_controller.p