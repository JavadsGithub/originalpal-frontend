# Original Pal — Frontend

Next.js 16 (App Router) client for **[originalpal-server-python](https://github.com/JavadsGithub/originalpal-server-python)**,
a FastAPI backend using Clean Architecture, JWT auth (HttpOnly refresh cookie), RBAC, and a
`StandardResponse` envelope on every endpoint.

The two projects are wired together on purpose, not by accident: the API contract, the permission
registry, and the transport model are all verified against a running backend. See
[`docs/integration/contract-audit.md`](docs/integration/contract-audit.md) for the full audit and
[`docs/integration/environment.md`](docs/integration/environment.md) for configuration details.

## Requirements

- Node.js 20+ (developed on 22) and **pnpm** (`corepack enable pnpm`)
- The backend running locally — see the section below

## Quick start

```bash
# 1. Backend (separate checkout)
#    cd ../originalpal-server-python && make init && make dev      # http://localhost:8000
#    Port 8004 is used by `uv run python -m app.main`, which is what this repo defaults to.

# 2. Frontend
pnpm install
cp .env.example .env.local     # defaults work as-is for a backend on 127.0.0.1:8004
pnpm dev                       # http://localhost:3000
```

Seeded backend account: **`admin` / `Secret123`** (super user → bypasses every permission check).

Verify the integration at any time:

```bash
pnpm smoke        # login → me → permissions → users → catalog → refresh → logout, through the proxy
pnpm check        # typecheck + lint + permission-registry drift check
```

## How the frontend talks to the API

```
Browser ──/api/*──► Next.js server (same origin) ──API_PROXY_TARGET──► FastAPI
```

* The browser only ever calls **its own origin** (`/api/...`), so there is **no CORS** involved and
  the backend's `HttpOnly` `refresh_token` cookie is **first-party**.
* `app/api/[...path]/route.ts` forwards `/api/*` to `API_PROXY_TARGET` (default
  `http://127.0.0.1:8004`) — a streaming route handler rather than a `rewrites()` entry, because
  rewrites normalise trailing slashes (breaking `/api/users/`) and pass the backend's absolute
  `Location` header through (leaking an unreachable internal host). It forwards the path verbatim,
  rewrites backend-origin redirects to same-origin paths, and keeps every `Set-Cookie` intact.
* Frontend-owned route handlers under `app/api/**` (for example `GET /api/health`) win over the
  proxy; everything else under `/api` is forwarded verbatim, including uploads and file downloads.
* Set `NEXT_PUBLIC_API_URL` to an absolute URL only if you want the browser to call the backend
  directly — that requires a matching CORS allowlist on the backend.

## Architecture

The component framework is documented in
[`docs/cookbook/component-development-framework.md`](docs/cookbook/component-development-framework.md).
In short:

| Layer | Location | Rule |
| --- | --- | --- |
| 1. App | `app/layout.tsx`, `components/layout/` | providers, shells, global setup |
| 2. Route | `app/**/page.tsx` | imports **dependency injectors** only |
| 3. Component | `components/feature/**` | `index.tsx` = pure UI (primitives only), `<Name>.tsx` = injector that wires data |
| Data | `data/feature/**` | one hook per concern; owns all API access |
| Networking | `lib/fetcher.ts`, `lib/api-error.ts`, `lib/config.ts`, `lib/types/` | envelope, tokens, errors, types |

## Contract rules the code depends on

| Rule | Detail |
| --- | --- |
| Envelope | `{success, message, payload}`; `payload` may be `null` (e.g. `GET /api/ping`) |
| Errors | domain failures use the envelope (`payload.error_code`); FastAPI's 422 uses `{detail:[...]}` — both normalised by `lib/api-error.ts` into `ApiError` |
| 401 vs 403 | 401 → refresh once, else session expired; 403 → authenticated but not allowed (never logs out) |
| Collection paths | declared with a trailing slash (`/api/users/`); without it FastAPI answers **307** |
| Pagination | `{items,total,page,size,pages}` with `page`/`size` query params |
| Permissions | ids live in `lib/permissions.ts`, **generated** from the backend registry (`pnpm permissions:sync`) |
| Access token | memory only; a reload restores the session through one silent `POST /api/auth/refresh` |

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | dev server on `0.0.0.0:3000` (proxy active) |
| `pnpm build` / `pnpm start` | production build / serve |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm check` | typecheck + lint + `permissions:check` + `pnpm test` |
| `pnpm test` / `pnpm test:watch` / `pnpm test:ui` | unit & integration tests (vitest + MSW, no backend needed) |
| `pnpm test:e2e` / `pnpm test:e2e:ui` | browser end-to-end tests (Playwright, needs the backend + `pnpm exec playwright install chromium`) |
| `pnpm permissions:sync` | regenerate `lib/permissions.ts` from `statics/permissions.json` |
| `pnpm permissions:sync -- --from ../originalpal-server-python/statics/permissions.json` | refresh the snapshot from the backend, then regenerate |
| `pnpm permissions:check` | fail if the generated registry is stale (CI gate) |
| `pnpm api:generate` | orval client generation from `OPENAPI_JSON_URL` (output in git-ignored `lib/api`) |
| `node scripts/seed-storefront-demo.mjs` | seeds a small `demo-` labelled catalog (categories, one variant attribute, three published products, two homepage blocks) through the API so the storefront has something to show; `--clean` removes it again |
| `pnpm smoke` | end-to-end contract check through the proxy against the live backend: auth lifecycle, RBAC, pagination, the catalog (upload → product → SKU → publish gates → archive) the customer account (register → profile → password recovery → address book) and the storefront (public catalog, filters, homepage blocks) |

## Testing

Three layers, from fastest to most convincing:

| Layer | Command | What it proves |
| --- | --- | --- |
| Unit / integration | `pnpm test` | the client layer against MSW replicas of live responses: envelope unwrapping, 401→refresh→replay, 422 normalisation, permission gates, table behaviour, the customer rules |
| Headless contract | `pnpm smoke` | the real stack — browser-facing contract → `/api/*` proxy → FastAPI. Walks the admin account lifecycle (create inactive → activate → assign role → delete), the catalog lifecycle (upload → category/attribute links → product → SKU → the three publish gates → archive) the customer lifecycle (register → profile → recovery → addresses) and the storefront (anonymous public catalog, search/category filters, the active-SKU roll-up, homepage block rules), cleaning up after itself |
| Browser end-to-end | `pnpm test:e2e` | the same flows *through the UI*, including session restore after a reload |

`pnpm test:e2e` needs a browser: `pnpm exec playwright install chromium`, a running backend with seed
data, and (optionally) `E2E_BASE_URL` / `E2E_USERNAME` / `E2E_PASSWORD`. In a sandbox without access to
the Playwright browser CDN, use `pnpm smoke` — it covers the same endpoints without a browser.

## Back office

`/admin` is the real administration area (the `/examples/**` pages stay as framework showcases):

| Screen | Endpoints | Gate |
| --- | --- | --- |
| `/admin/users` | `GET/POST /api/users/`, `PUT/DELETE /api/users/{id}`, `POST|DELETE /api/users/{id}/roles/{roleId}` | `users:read`, with per-action gates on `users:create|update|delete|assign_role|unassign_role` |
| `/admin/roles` | `GET/POST /api/roles/`, `PUT/DELETE /api/roles/{id}`, `POST|DELETE /api/roles/{id}/permissions/{permissionId}` | `roles:read`, with per-action gates on `roles:create|update|delete|assign_permission|unassign_permission` |
| `/admin/catalog/products` | `GET/POST /api/products/`, `PUT/DELETE /api/products/{id}`, `POST /api/products/{id}/{publish,unpublish}` | reads are public; `products:create|update|publish|unpublish|delete` gate each action |
| `/admin/catalog/products/{id}` | product detail: publish checklist, SKUs, attribute values | per-action gates on `skus:*` and `attribute-values:*` |
| `/admin/catalog/categories` | `GET/POST /api/categories/`, `PUT/DELETE /api/categories/{id}`, `…/attributes/` links | reads are public; `categories:*` and `category-attributes:*` gate each action |
| `/admin/catalog/brands` | `GET/POST /api/brands/`, `PUT/DELETE /api/brands/{id}` | reads are public; `brands:*` gate each action |
| `/admin/catalog/attributes` | `GET/POST /api/attributes/`, `PUT/DELETE /api/attributes/{id}` | reads are public; `attributes:*` gate each action |
| `/admin/catalog/media` | `GET /api/files`, `POST /api/upload`, `DELETE /api/files/{id}` | `uploads:read` for the screen itself, plus `uploads:create|delete|download` per action |

New accounts are created **inactive** (backend behaviour) — the UI says so and activation is one click
(`PUT /api/users/{id}` `{is_active:true}`).

### Catalog behaviour worth knowing before touching it

All of it is probed live and written up in
[§10 of the contract audit](docs/integration/contract-audit.md):

* **Publication has three gates, in order** — gallery, an active SKU, then the required attribute
  values (including the ones inherited from parent categories). `PublishChecklist` mirrors them so the
  admin sees why a product is blocked, but `POST /api/products/{id}/publish` is still the authority.
* **Archiving removes the product from the API.** `DELETE /api/products/{id}` returns
  `status: "archived"` and then `GET /api/products/{id}` answers `404` — the detail page renders that
  as a "not found" state. Slugs are unique among non-archived products (a duplicate answers
  `409 CONFLICT`), and archiving frees the slug because the row is gone.
* **Attribute values are typed JSON**, validated against the definition: numbers must be numbers,
  choices must come from `choices`, and a `sku`-level attribute cannot be answered on the product.
  `lib/types/catalog.ts` + `AttributeValueField` encode this; the dialogs send typed values.
* **Attribute links decide the level.** A variant attribute may only be linked at `value_level: "sku"`;
  the SKU dialog offers all non-`product` links, the product panel the rest.
* There is no public URL for an uploaded file: images are served through
  `GET /api/files/{id}/download` (`uploads:download`), so previews need that permission.

## Customer account

The storefront-facing half of the account model (audit §11):

| Screen | Endpoints | Gate |
| --- | --- | --- |
| `/register` | `POST /api/auth/register` | public — the account is **active immediately** (unlike `POST /api/users/`) and no token is issued, so the flow ends on `/login?registered=1` |
| `/account` | `GET /api/auth/me`, `PUT /api/auth/me` | session only — a self-registered account has **zero permissions**, so nothing here may be permission-gated |
| `/account/addresses` | `GET/POST /api/me/addresses/`, `PUT/DELETE /api/me/addresses/{id}` | session only; another customer's address answers `404` |
| `/forgot-password` | `POST /api/auth/recovery/request` | public — the API answers `accepted: true` whether or not the email exists |
| `/reset-password?token=…` | `POST /api/auth/recovery/reset` | public — single-use token, one hour, and the old password stops working |

Three behaviours worth knowing before touching it:

* **Registration ≠ the admin endpoint.** `POST /api/auth/register` creates an *active* account with no
  roles; `POST /api/users/` creates an *inactive* one for an admin to activate.
* **The reset token comes back in the response.** The backend has no outbound email yet, so
  `POST /api/auth/recovery/request` returns the raw token for a known account. The screen shows it and
  says why; backend follow-up **#11** proposes the notifier port that removes the leak while keeping this
  flow working locally.
* **The profile is partial and email-free.** `PUT /api/auth/me` accepts `first_name`, `last_name`,
  `username`, refuses an empty body (`422 field=profile`) and refuses `email` outright (unknown field),
  so the form renders the email as read-only.

## Storefront

The public half of the app lives in the `app/(storefront)` route group, so the URLs are the plain
shopper ones and the shell is the same signed out or signed in:

| Screen | Endpoints | Notes |
| --- | --- | --- |
| `/` | `GET /api/homepage/` | editor-managed blocks (audit §12) rendered per `block_type`; navigation comes from the API, not from a hardcoded list |
| `/search` | `GET /api/catalog/products/`, `GET /api/categories/`, `GET /api/brands/` | filters live in the URL (`?q=&category=&brand=`); the term is debounced, selects apply at once |
| `/categories`, `/categories/{id}` | `GET /api/categories/`, `GET /api/catalog/products/?category_id=…` | the tree is built from the flat list; the page links to its children because `category_id` is an exact match |
| `/products/{id}` | `GET /api/catalog/products/{id}` | by **id** (there is no slug-addressed public route); `404` is a real state — drafts and sold-out-of-active-SKUs products both answer it |
| `/cart`, `/blog` | – | placeholders, because the API's navigation advertises them before the features exist |
| `/dev` | – | the previous integration-status page: every slice's entry points in one list |

Three things about this surface are deliberate, all of them verified live (audit §12):

* **No session, ever.** Every read above is anonymous; the storefront never attaches an access token to a
  product query (`data/feature/storefront/useGetPublicProducts` asserts that in a test).
* **Images are placeholders.** `GET /api/files/{id}/download` answers `401` for a shopper, so cards say
  "image needs staff access", the gallery lists file ids, and a banner only renders an external
  `http(s)` URL. Backend follow-up **#15** proposes the public media route that removes this.
* **What the API cannot answer, the UI says.** A category page admits it does not include
  subcategories; a homepage block lists the `target_ids` that no longer resolve instead of showing an
  empty shelf; a product that vanished from the public catalog explains which states cause that.

## Roadmap

The backend exposes 114 operations; the frontend consumes auth, users, roles, the catalog back office,
the public storefront reads and the whole commerce life cycle. Next slices, in the order the audit
suggests:

1. ~~Admin back-office: users + roles + permission pickers~~ — done (§9 of the audit).
2. ~~Catalog management: products, SKUs, categories, attributes, brands (+ uploads for images)~~ — done
   (§10 of the audit).
3. ~~Customer account: register, profile update, password recovery~~ — done (§11 of the audit).
4. ~~Storefront browsing: public catalog, category/search pages, homepage blocks~~ — done (§12 of the
   audit).
5. ~~Cart → checkout → orders: `/api/carts` (guest and customer), delivery options, checkout sessions,
   payments, orders, order messages, back-office fulfilment~~ — done (§13 of the audit): `/cart`,
   `/checkout`, the guest order page with the mock payment panel, `/orders/lookup`, `/account/orders`,
   `/admin/orders` and the four order permissions.
6. Remaining backend surfaces: policies, brands/attributes admin polish, and the follow-ups in
   `docs/integration/backend-follow-ups/` (now #1–#21).
