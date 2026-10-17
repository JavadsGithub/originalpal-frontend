# Environment & transport

## Variables

| Variable | Scope | Default | Meaning |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | browser + server | *(empty → `/api`)* | Base URL the browser uses for API calls. Empty means same-origin, i.e. proxied by Next.js (recommended). Set an absolute URL to bypass the proxy. |
| `API_PROXY_TARGET` | server only | `http://127.0.0.1:8004` | Where the Next.js server forwards `/api/*`. Never exposed to the browser. `BACKEND_URL` is accepted as an alias. |
| `OPENAPI_JSON_URL` | tooling only | – | Spec URL for `pnpm api:generate` (required by `orval.config.ts`). |
| `DEV_ALLOWED_ORIGINS` | dev server | – | Extra comma-separated origins allowed to load `next dev` internals. `*.e2b.app` and `*.arena.ai` are always allowed. |

Copy `.env.example` to `.env.local`. `.env*` files are git-ignored, `.env.example` is the contract.

### Choosing the backend port

The backend listens on `8000` for `make dev` / `uvicorn app.main:app` and on `8004` for
`uv run python -m app.main`. This repo defaults to **8004** because that is the entry point the
backend's own README documents for direct execution. Change `API_PROXY_TARGET` if you use 8000.

## Why the proxy exists

Direct browser → backend calls fail in three ways:

1. **CORS.** `app/infra/core/add_middlewares.py` allowlists four `localhost` origins. A deployed
   origin (or the sandbox Preview host) gets a `400` preflight with no `Access-Control-Allow-Origin`
   header — verified live. A proxy removes CORS from the browser path entirely.
2. **Preview/browser locality.** In a hosted sandbox the user's browser cannot reach the sandbox's
   `127.0.0.1:8004`; only the sandbox's own Next.js server can. The proxy keeps the API reachable.
3. **Cookies.** The `refresh_token` cookie is `HttpOnly; SameSite=strict`. Through a proxy it is
   first-party on the frontend origin and travels reliably; cross-origin it is subject to
   third-party-cookie policies.

The proxy is `app/api/[...path]/route.ts`. A `next.config.ts` rewrite was tried first and rejected:
it forwarded `/api/users/` as `/api/users` (causing the backend's 307) and let the backend's absolute
`Location` header reach the browser pointing at `http://127.0.0.1:8004/...`, which is unreachable
from anywhere but the machine running the backend. The route handler forwards the path
byte-for-byte, rewrites backend-origin redirects into same-origin relative paths, and adds a
`502 NETWORK_ERROR` envelope when the backend is down.

If you ever need direct mode, add your origin to the backend's CORS list **and** remember that the
access token is memory-only, so the refresh cookie must still reach the backend.

## Request flow

```
POST /api/auth/login
  browser ──► Next.js :3000  /api/auth/login ──► FastAPI :8004 /api/auth/login
             ◄── envelope {success, message, payload:{token,...}}  +  Set-Cookie: refresh_token
```

`Set-Cookie` is forwarded untouched, so the cookie is stored for the **frontend** origin. The
browser never sees the refresh token, and no code in this repo reads it.

## Failure modes and their symptoms

| Symptom | Cause | Fix |
| --- | --- | --- |
| `ApiError` "Cannot reach the API…" (`isNetworkError`) | proxy target down or wrong port | start the backend, check `API_PROXY_TARGET` |
| `/api/auth/me` 401 on first load in a fresh browser profile | no refresh cookie yet — expected for a signed-out visitor | sign in |
| Endless 401s after a server restart | refresh cookie rotated/revoked by the backend | the fetcher emits `session-expired`; the provider clears identity and guards redirect to `/login` |
| 307 responses in the network tab | collection endpoint called without its trailing slash | use `/users/`, `/roles/`, `/products/`, … |
| 422 arrives as `{detail:[...]}` instead of the envelope | FastAPI's own `RequestValidationError` handler is not registered on the backend | `lib/api-error.ts` normalises both; backend fix tracked in the audit (§8) |
| Permission gates deny a user that should have access | `lib/permissions.ts` drifted from the backend registry | `pnpm permissions:sync -- --from ../originalpal-server-python/statics/permissions.json` |
| `pnpm api:generate` throws about `OPENAPI_JSON_URL` | codegen env not set | add it to `.env` (not `.env.local`; orval loads `.env` via dotenv) |
| `next build` fails with "Failed to fetch `Geist`/`Inter` from Google Fonts" | `app/layout.tsx` uses `next/font/google`, which downloads fonts at build time | build with network access, or switch to `next/font/local` for offline/CI-safe builds (this sandbox blocks `fonts.googleapis.com`) |
| orval-generated code types responses as the envelope | orval types responses from the OpenAPI schema, while `customFetcher` returns `payload` | expected; see the note in `orval.config.ts` |

## Code generation (optional)

`orval.config.ts` generates two clients into the git-ignored `lib/api/`:

* `lib/api/v1/index.ts` — axios functions using the `customFetcher` mutator (envelope-unwrapping);
* `lib/api/v1/hooks.ts` — React Query hooks using the `fetcherHookAdapter` mutator.

The handwritten `data/feature/**` hooks remain the contract-bearing layer (they are what the
component framework documents, and they keep working in a fresh clone where `lib/api` does not
exist yet). Generated types are useful when adding new domains quickly.

## Server-side calls

`lib/config.ts` exposes both `PUBLIC_API_BASE_URL` (relative by default — browser only) and
`SERVER_API_BASE_URL` (always absolute). Anything running in Node — route handlers, RSC, server
actions — must use the latter, because a relative URL cannot be fetched server-side. Note that
server-side calls do **not** carry the browser's cookies unless you forward them explicitly.
