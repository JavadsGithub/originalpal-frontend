# Backend follow-ups for `originalpal-server-python`

Findings from the frontend integration audit, written as **ready-to-apply patches**. All of them were
reproduced against a live instance of the backend at commit `3d82827bca55928d7ad540e025a1263ded3f72f5`
(cloned, migrated with Alembic, seeded, booted on `:8004`).

Nothing here blocks the frontend today — the same-origin proxy in `app/api/[...path]/route.ts` means the
browser never performs a CORS preflight, and `lib/api-error.ts` already normalises both error shapes.
These are the fixes that remove workarounds and pre-empt bugs on the backend side.

| # | Item | Severity | Blocks |
| --- | --- | --- | --- |
| 1 | CORS origins are hardcoded | medium | direct/deployed API access, any second frontend origin |
| 2 | `RequestValidationError` escapes the response envelope | medium | uniform client error handling |
| 3 | `alembic/env.py` ignores `.env` | medium | `make migrate` on a fresh clone |
| 4 | `fastapi` / `fastapi-pagination` version mismatch | medium | pagination behaviour, future upgrades |
| 5 | Refresh cookie is never `Secure` | low (prod: high) | HTTPS deployments |
| 6 | New accounts are created inactive, including self-registration | **high** | customer registration UX |
| 7 | `/api/auth/permissions` policy inlining is dead code | low | permission admin UI showing policies |
| 8 | Order-by-id endpoints are unauthenticated | medium (security review) | guest-order link sharing |
| 9 | Product `409`s do not say which field conflicted | low | telling a duplicate slug from a bad brand/category |
| 10 | `ProductCreate` ignores unknown fields | low | silent typos (e.g. `status` on create) |
| 11 | Password recovery returns the reset token in the response | **high** (production) | password reset actually being a secret |
| 12 | Homepage `target_ids` are stored without validation | medium | blocks pointing at deleted products |
| 13 | *(withdrawn — `display_order` **is** honoured; see §12 of the audit)* | — | — |
| 14 | Public `category_id` filter has no descendant roll-up | medium | category browsing a shopper can trust |
| 15 | Uploaded files are not publicly readable | **high** (storefront) | product and banner images |
| 16 | Inline `option_values` bypass attribute validation | medium | one fact, two sources of truth |
| 17 | SKU `code` is consumed forever and archived rows are unreachable | medium | rebuilding a product after archiving |
> **Note on #13.** An earlier probe recorded the public homepage feed as ignoring `display_order`; that
> was **wrong** — the probe's blocks all carried the default `0`, so insertion order looked arbitrary.
> Re-probed with explicit orders (`9`, `1`, `5`, created out of order): `list_active()` orders by
> `display_order, created_at, id` and the feed comes back `1, 5, 9`. The storefront adds no client-side
> sorting and the smoke suite asserts the order. The number is kept so existing references stay stable.

---

## 1. CORS origins from configuration

**Evidence** (live preflight for a Preview-style origin):

```
origin=http://localhost:3000      → 200, ACAO=http://localhost:3000, ACAC=true
origin=https://3000-abc123.e2b.app → 400, ACAO=None
```

`allow_origins` is a literal list in `app/infra/core/add_middlewares.py`, so every new deployment
origin needs a code change.

### `app/infra/core/config.py`

```diff
     default_pagination_limit: int = Field(default=10, alias="DEFAULT_PAGINATION_LIMIT")
+
+    # CORS -------------------------------------------------------------------
+    # Comma-separated list of allowed browser origins. Keep it explicit: the
+    # refresh cookie is sent with credentials, so a wildcard is not an option.
+    cors_origins: str = Field(
+        default=(
+            "http://localhost:3000,http://localhost:5173,"
+            "http://127.0.0.1:3000,http://127.0.0.1:5173"
+        ),
+        alias="CORS_ORIGINS",
+    )
+    # Optional regex for ephemeral preview hosts, e.g. r"https://[a-z0-9-]+\.e2b\.app"
+    cors_origin_regex: str = Field(default="", alias="CORS_ORIGIN_REGEX")
@@
     model_config = {
         "populate_by_name": True,
         "env_file": ".env",
         "env_file_encoding": "utf-8",
         "extra": "ignore",
     }
+
+    @property
+    def cors_origin_list(self) -> list[str]:
+        """Parsed CORS_ORIGINS value, without empty entries."""
+        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
```

### `app/infra/core/add_middlewares.py`

```diff
 from fastapi import FastAPI
 from fastapi.middleware.cors import CORSMiddleware
+
+from app.infra.core.config import config
 
 
 def add_middlewares(app: FastAPI):
     app.add_middleware(
         CORSMiddleware,
-        allow_origins=[
-            "http://localhost:3000",  # React dev server
-            "http://localhost:5173",  # Vite dev server
-            "http://127.0.0.1:3000",
-            "http://127.0.0.1:5173",
-            # Add your production domain later
-        ],
+        allow_origins=config.cors_origin_list,
+        allow_origin_regex=config.cors_origin_regex or None,
         allow_credentials=True,  # Required for cookies/auth
         allow_methods=["*"],  # Or specify: ["GET", "POST", "PUT", "DELETE"]
         allow_headers=["*"],  # Or specify headers you need
         expose_headers=["*"],  # Expose custom headers to browser
         max_age=600,  # Cache preflight requests for 10 minutes
     )
```

### `.env.example`

```diff
 # JWT Configuration
 SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
 ALGORITHM=HS256
 ACCESS_TOKEN_EXPIRE_MINUTES=30
+
+# CORS (comma separated; the frontend normally proxies same-origin and needs no entry)
+CORS_ORIGINS=http://localhost:3000,http://localhost:5173
+# CORS_ORIGIN_REGEX=https://[a-z0-9-]+\.e2b\.app
+
+# Cookies
+COOKIE_SECURE=false
```

**Verify:** `curl -i -X OPTIONS $API/api/auth/login -H "Origin: $YOUR_ORIGIN" -H "Access-Control-Request-Method: POST"` → `200` + `access-control-allow-origin: $YOUR_ORIGIN`.

---

## 2. Give `RequestValidationError` the standard envelope

**Evidence** (live):

```
POST /api/auth/login  {"username":"admin"}   → 422
{"detail":[{"type":"missing","loc":["body","password"],"msg":"Field required","input":{"username":"admin"}}]}

POST /api/products/{id}/skus/{skuId}/stock-adjustments  {"quantity_delta":0,"reason":""}  → 422
{"detail":[{"type":"value_error","loc":["body","quantity_delta"],"msg":"Value error, quantity_delta must be a non-zero integer", ...}]}
```

Both the auth and the catalog endpoints behave the same way, so the catalog added no new shape — it
just produces this one more often (every blank reason and every zero delta).

Domain exceptions are enveloped by `register_domain_exception_handlers`, but FastAPI's own validation
errors are not, so clients see two shapes. Bindings must either duplicate the parsing (the frontend does,
in `lib/api-error.ts`) or lose the message.

### `app/domain/error/exception_handlers.py`

```diff
 import logging
 
 from fastapi import FastAPI, Request, status
+from fastapi.encoders import jsonable_encoder
+from fastapi.exceptions import RequestValidationError
 from fastapi.responses import JSONResponse
@@
 def register_all_exception_handlers(app):
     """Register all exception handlers (both domain and generic)."""
     # Register the global exception handler first
     register_exception_handler(app)
     # Then register domain exception handlers
     register_domain_exception_handlers(app)
+    # Finally the request-validation handler, so 422s follow the same envelope
+    register_request_validation_handler(app)
+
+
+def register_request_validation_handler(app: FastAPI):
+    """Return FastAPI's 422 validation failures in the standard envelope format."""
+
+    @app.exception_handler(RequestValidationError)
+    async def handle_request_validation_error(
+        request: Request, exc: RequestValidationError
+    ):
+        response_data = failure(
+            "Validation failed",
+            payload={
+                "error_code": "VALIDATION_ERROR",
+                "details": {"errors": exc.errors()},
+                "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY,
+            },
+        )
+        # `exc.errors()` may embed non-serialisable values (e.g. bytes) in `input`.
+        return JSONResponse(
+            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
+            content=jsonable_encoder(response_data.model_dump()),
+        )
```

**Frontend impact:** none required — `lib/api-error.ts` already handles both shapes, and
`ApiError.isValidationError`/`fieldErrors` keep working. The change makes `error_code` uniform.

**Verify:** the smoke script's "missing field" check should print *"the standard envelope"* instead of
*"FastAPI's {detail:[...]}"*.

---

## 3. Make Alembic read `.env`

**Evidence** — reproduced by pointing `.env` at SQLite while `alembic.ini` still held the Postgres URL:

```
$ alembic upgrade head
ModuleNotFoundError: No module named 'asyncpg'
```

`alembic/env.py` reads `os.environ.get("DATABASE_URL", …)` directly and never imports the settings
object that loads `.env`, so the README's *"configure `.env` … then `make migrate`"* only works when the
variable is exported by the shell. (Shell-env use still wins, which is what CI wants.)

### `alembic/env.py`

```diff
 from sqlalchemy import pool
 from sqlalchemy.ext.asyncio import async_engine_from_config
 
+from app.infra.core.config import config as app_config
 from app.infra.repositories.sql.models import Base
 
 
 config = context.config
 if config.config_file_name is not None:
     fileConfig(config.config_file_name)
 
 config.set_main_option(
     "sqlalchemy.url",
-    os.environ.get("DATABASE_URL", config.get_main_option("sqlalchemy.url")),
+    # Precedence: explicit environment > .env (via pydantic-settings) > alembic.ini
+    os.environ.get("DATABASE_URL") or app_config.database_url,
 )
```

**Verify:** with `.env` set to a throwaway database, `alembic upgrade head` succeeds without exporting
`DATABASE_URL`; `DATABASE_URL=… alembic upgrade head` still overrides it.

---

## 4. Align `fastapi` and `fastapi-pagination`

**Evidence** — printed on every boot:

```
FastAPIPaginationWarning: FastAPI v0.128.0 or higher is required for full compatibility.
Please upgrade your FastAPI version to avoid potential issues.
Support for FastAPI versions lower than v0.128.0 will be dropped in fastapi-pagination v0.16.0.
```

`pyproject.toml` pins `fastapi==0.115.6` while resolving `fastapi-pagination>=0.15.3` (unbounded).

Pick one:

**Option A — upgrade (recommended, then re-run `make test`)**

```diff
 dependencies = [
-    "fastapi==0.115.6",
+    "fastapi>=0.128.0,<0.129",
     "uvicorn[standard]>=0.38.0",
     "pydantic-settings>=2.0.0",
     "python-jose[cryptography]>=3.3.0",
     "loguru>=0.7.3",
-    "fastapi-pagination>=0.15.3",
+    "fastapi-pagination>=0.15.3,<0.16",
 ]
```

**Option B — freeze the current behaviour** (no FastAPI bump): `fastapi-pagination>=0.15.3,<0.16`.
Note this only postpones the warning; `0.16` will require FastAPI ≥ 0.128.

After either change run `uv lock`, then `make test` — the pagination contract
(`{items,total,page,size,pages}`) is asserted by the frontend's `pnpm smoke` too.

---

## 5. Make the refresh cookie `Secure` configurable

**Evidence** — login response through the live backend:

```
Set-Cookie: refresh_token=…; HttpOnly; Max-Age=604800; Path=/; SameSite=strict
```

`secure=False` is hardcoded in `auth_controller.login`, so the cookie is also sent over plain HTTP in
production. `delete_cookie` should mirror the same attributes.

### `app/interface/controller/auth_controller.py`

```diff
     response.set_cookie(
         key=result.refresh_token.title,
         value=result.refresh_token.token,
         httponly=True,
-        secure=False,  # Set to True in production with HTTPS
+        secure=config.cookie_secure,  # COOKIE_SECURE=true behind HTTPS
         samesite="strict",
         max_age=int(timedelta(days=config.refresh_token_expire_days).total_seconds()),
         path="/",
     )
@@
-        response.delete_cookie(key="refresh_token", path="/")
+        response.delete_cookie(
+            key="refresh_token",
+            path="/",
+            secure=config.cookie_secure,
+            samesite="strict",
+            httponly=True,
+        )
```

Add to `config.py` (see item 1's `.env.example` block):

```python
    cookie_secure: bool = Field(default=False, alias="COOKIE_SECURE")
```

**Verify:** with `COOKIE_SECURE=true` the `Set-Cookie` line ends with `; Secure`.

---

## 6. Activation semantics — new accounts cannot sign in

**Evidence.** `UserEntity.create(...)` hardcodes `is_active=False`:

```python
return cls(..., is_active=False, roles=roles)
```

and both `CreateUserUseCase` and `RegisterCustomerUseCase` build the entity through it. Reproduced
end-to-end while writing the frontend's RBAC test: `POST /api/users/` → `POST /api/users/{id}/roles/{role_id}`
→ `POST /api/auth/login` → **`401 INACTIVE_USER`**, until an explicit
`PUT /api/users/{id}` with `{"is_active": true}`.

The seeded admin only works because `app/infra/core/seed.py` calls `user.activate()` manually — a signal
that this is an oversight rather than a design choice.

**Recommended fix** — make the intent explicit instead of implicit:

```diff
 @dataclass
 class UserEntity:
     ...
     @classmethod
     def create(
         cls,
         first_name: str,
         last_name: str,
         email: str,
         username: str,
         hashed_password: str,
         user_id: Optional[str] = None,
         roles: Optional[List["RoleEntity"]] = None,
+        is_active: bool = False,
     ) -> "UserEntity":
```

and have `RegisterCustomerUseCase` pass `is_active=True` (self-service customers) while the admin
`CreateUserUseCase` keeps the default `False` (admin invites/activates). If customer accounts are meant to
require approval instead, keep them inactive **and** return that state to the client, e.g.
`{"accepted": true, "activation_required": true}`, so the UI can say "check your inbox" rather than
letting the user hit an unexplained 401 at the login screen.

**Frontend impact today:** the admin user screen exposes the `is_active` toggle
(`PUT /api/users/{id}`) because of this finding, and the smoke/`client` tests document the behaviour.

---

## 7. `/api/auth/permissions` — policy inlining is dead code

**Evidence (live, 200):**

```json
{"success":true,"message":"Permissions retrieved successfully",
 "payload":[{"title":"super:user","description":"Ability to do anything",
             "id":"708269c3-…","created_at":"2025-12-12T00:31:06Z","updated_at":"2025-12-13T19:35:32Z"}]}
```

The controller loops over `permission.get("policies", [])` and replaces ids with full policy objects, but
`PermissionMapper.to_dto()` produces a DTO with **no** `policies` field, so the loop never runs — and even
if it did, `response_model=StandardResponse[list[PermissionDTO]]` would drop the extra key.

Choose one:

**A — drop the illusion** (smallest change, honest contract):

```diff
 @auth_router.get("/permissions", response_model=StandardResponse[list[PermissionDTO]])
 async def get_permissions(
     usecase: GetAllPermissionsUseCase = Depends(get_get_all_permissions_usecase),
     _=Depends(get_authorized_user([Permission.Permissions_Read])),
 ):
-    """Return all permissions with their associated policy objects from the JSON files."""
+    """Return all permissions."""
     try:
         # Get permissions from the use case
         result = await usecase.execute(GetAllPermissionsRequest())
         permissions = [
             PermissionMapper.to_dto(permission).model_dump()
             for permission in result.permissions
         ]
-
-        # Load policies from JSON file (still needed for full policy objects)
-        with open(config.policies_path, "r") as f:
-            policies = json.load(f)
-
-        # Create a map of policy ID to policy object for efficient lookups
-        policies_map = {policy["id"]: policy for policy in policies}
-
-        # Replace policy IDs in each permission with full policy objects
-        for permission in permissions:
-            policy_objects = []
-            for policy_id in permission.get("policies", []):
-                if policy_id in policies_map:
-                    policy_objects.append(policies_map[policy_id])
-            permission["policies"] = policy_objects
 
         return success(
             message="Permissions retrieved successfully", payload=permissions
         )
```

**B — actually expose policies** (if the UI should show them):

```python
class PermissionWithPolicies(Permission):
    """Public permission model including its policy objects."""
    policies: list[Policy] = Field(default_factory=list)
```

add `policies` to the entity, the JSON repository and `PermissionMapper.to_dto`, and return
`StandardResponse[list[PermissionWithPolicies]]`. Note `statics/policies.json` currently holds a single
`default` policy, so there is little to show yet.

**Frontend impact:** `lib/types/auth.ts` documents `Permission` **without** `policies`, and the permission
picker reads the registry from `lib/permissions.ts` (generated). Once option B exists, extend the DTO type.

---

## 8. Order-by-id endpoints are unauthenticated

These have no `get_authorized_user` dependency at all, so anyone holding an order id can read the order:

```
GET  /api/orders/{order_id}
GET  /api/orders/{order_id}/payment-attempts/
GET  /api/orders/{order_id}/payment-attempts/{attempt_id}
POST /api/orders/{order_id}/payment-attempts/
POST /api/orders/{order_id}/guest-cancel
POST /api/payment-attempts/{attempt_id}/verify
```

This is very likely intentional for guest checkout (the id is a UUIDv4 capability URL), but it deserves an
explicit decision, because:

* `GET /api/orders/{order_id}` returns the full order DTO — customer details, shipping address, items;
* `POST /api/orders/{order_id}/guest-cancel` mutates state without any proof of possession;
* a "share my order link" feature or a referrer leak turns a capability into a disclosure.

If the capability model is intended, document it in `auth-contracts.md` and consider a short-lived
signed token for cancel/verify (the `guest_order_association_tokens` table already exists for the
"claim my order" flow). Otherwise, require the association token or an authenticated customer whose id
matches the order.

**Frontend impact:** the checkout/order screens must keep treating order URLs as secrets (no analytics
referrers, no open-graph previews of order pages).

---

## 9. Say which field a product conflict is about

**Evidence** (live):

```
POST /api/products/  {"title":"Dup B","slug":"<taken>","category_id":"<ok>"}  → 409
{"success":false,"message":"Product slug or relationship conflicts with existing data",
 "payload":{"error_code":"CONFLICT","details":{},"status_code":409}}
```

`details` is empty, so a client cannot tell a duplicate slug from a category/brand that vanished — the
same message also covers the FK failures. Reactivating an old product with a taken slug and attaching a
deleted brand look identical.

### `app/infra/repositories/sql/product_repository.py`

```diff
         try:
             async with self._sessions.begin() as session:
                 session.add(model)
         except IntegrityError as exc:
-            raise ConflictException("Product slug or relationship conflicts with existing data") from exc
+            if "uq_commerce_products_live_slug" in str(exc.orig):
+                # The partial unique index only covers non-archived products.
+                raise ConflictException("Product slug already exists", field="slug") from exc
+            raise ConflictException("Product slug or relationship conflicts with existing data") from exc
```

The same guard belongs in `update`. `ConflictException(message, **kwargs)` already forwards keyword
arguments into `details`, so `field="slug"` is enough — the frontend's `lib/api-error.ts` turns
`details.field` into `fieldErrors`, which is how every other form in this repo shows its errors inline.

**Frontend impact:** none required; `ProductFormDialog` already renders `fieldErrors.slug` and
`fieldErrors.brand_id` when the backend sends them.

---

## 10. Forbid unknown fields on `ProductCreate`

**Evidence** (live): `ProductUpdate`, `SkuCreate`, `SkuUpdate` and the other update DTOs all set
`model_config = ConfigDict(extra="forbid")`, but `ProductCreate` does not — so this succeeds and the
extra field is silently dropped:

```
POST /api/products/  {"title":"...","slug":"...","category_id":"...","status":"published"}  → 200
                                                                          # created as a draft
```

A client that tries to publish at creation time gets a `200` and a draft product, with nothing telling
it why. (Publication intentionally has its own endpoint — the fix is to make the refusal loud.)

### `app/interface/dto/product_dto.py`

```diff
 class ProductCreate(BaseModel):
+    model_config = ConfigDict(extra="forbid")
+
     title: str
     slug: str
     category_id: str
```

Keep the same for `CategoryCreate`, `BrandCreate` and `AttributeDefinitionCreate`, which have the same
gap. `ConfigDict` is already imported in this module.

**Frontend impact:** none for correct clients; `lib/types/catalog.ts` only ever sends known fields.

---

## 11. Stop returning the password-reset token in the response

**Evidence** (live):

```
POST /api/auth/recovery/request  {"email":"<registered>"}  → 200
{"success":true,"message":"Password recovery accepted",
 "payload":{"accepted":true,"reset_token":"lhBrxIuLE_IPNGsIM_wV_irEaKSCMsLlL53p6k89ASw",
            "expires_at":"2026-10-15T19:47:07.729960Z"}}
```

The use case generates a strong token, stores only its SHA-256 hash, expires it after one hour and
invalidates previous ones — the token handling itself is sound. The problem is delivery: because
nothing sends email yet, the raw token is handed to whoever asked, over an unauthenticated endpoint.
Anyone who knows an email address can therefore take over the account, and the "no enumeration"
property (`accepted: true` either way) does not help, because the token itself reveals whether the
account exists.

This is **fine for local development and dangerous in production**, so it needs one of two shapes:

* **Preferred — send the token, never return it.** Add a notifier port next to `IPasswordService` and
  return `reset_token: None` unconditionally. The frontend already renders that branch: the recovery
  screen says *"No reset token came back, which means no active account uses that email"* and stops.

### `app/application/use_cases/customer_account/__init__.py`

```diff
 class RequestPasswordRecoveryUseCase:
-    def __init__(self, user_repository: IUserRepository, reset_token_repository):
+    def __init__(
+        self,
+        user_repository: IUserRepository,
+        reset_token_repository,
+        notifier: IPasswordResetNotifier,
+        expose_token: bool = False,
+    ):
         self._users = user_repository
         self._reset_tokens = reset_token_repository
+        self._notifier = notifier
+        self._expose_token = expose_token
@@
-        return RequestPasswordRecoveryResponse(
-            accepted=True, reset_token=raw_token, expires_at=expires_at
-        )
+        await self._notifier.send_reset_token(user.email, raw_token, expires_at)
+        return RequestPasswordRecoveryResponse(
+            accepted=True,
+            # Only the local/dev configuration may echo the token back.
+            reset_token=raw_token if self._expose_token else None,
+            expires_at=expires_at,
+        )
```

Gate `expose_token` on a config flag (`PASSWORD_RESET_EXPOSE_TOKEN=false` by default), so a developer
can still drive the flow by hand while production never leaks it.

**Frontend impact:** none required — the UI shows the token when it is present and explains the
absence when it is not. `docs/integration/contract-audit.md` §11 says as much, so the behaviour is
documented rather than assumed.

---

## 12. Validate `target_ids` on homepage blocks

**Evidence.** `POST /api/homepage/blocks/` accepts any UUID:

```bash
curl -s -X POST http://127.0.0.1:8004/api/homepage/blocks/ -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"block_type":"products","title":"Ghost","target_ids":["00000000-0000-4000-8000-000000000000"]}'
# → 200 {"success":true,"message":"Homepage block created successfully","payload":{... "target_ids":["00000000-…"]}}

curl -s http://127.0.0.1:8004/api/homepage/ | jq '.payload.blocks[].title'
# → "Ghost" — the dangling block is served to the storefront
```

Nothing checks that the ids exist, that they belong to the block's `block_type`, or that they are
publicly visible afterwards. Editing a block is a partial `PUT` (omitted fields are preserved), so a
block written once keeps its ids even after the product is archived — and archiving **deletes the row**,
so the id never resolves again.

**Impact today.** The storefront resolves what it can and lists the ids it cannot
(`components/feature/storefront/HomepageBlocks`), so a shopper sees a warning instead of an empty shelf.
That is a graceful degradation, not a fix: the merchant's homepage silently loses a shelf.

**Patch — `app/application/use_cases/homepage/__init__.py`.** Validate in the create/update use cases,
where the product and category repositories are already available to the controller:

```python
    async def _validate_targets(self, block_type: str, target_ids: list[str]) -> None:
        if block_type == "products":
            missing = [i for i in target_ids if await self._product_repository.get_by_id(i) is None]
        else:
            missing = [i for i in target_ids if await self._category_repository.get_by_id(i) is None]
        if missing:
            raise ValidationException(
                f"Homepage block references unknown {block_type}: {', '.join(missing)}",
                field="target_ids",
            )
```

Call it from `CreateHomepageBlockUseCase.execute` and from `UpdateHomepageBlockUseCase.execute` (only
when `set_target_ids` is true, so a partial `PUT` that leaves the ids alone still works).

**Frontend impact:** none — the warning UI stays useful for rows written before the fix.

---

## 14. Roll `category_id` down the category tree

**Evidence** (live): a product moved into a child category is returned for the child but **not** for
the parent.

```
GET /api/catalog/products/?category_id=<child>  → total=1
GET /api/catalog/products/?category_id=<parent> → total=0
```

The storefront therefore has to enumerate descendants itself, and a category page can only ever show
its own shelf — while a shopper reading "Kitchen knives" reasonably expects the santokus underneath it.

**Patch — `app/infra/repositories/sql/public_catalog_repository.py`.** Collect the subtree once and
match with `IN` instead of `==`:

```python
    async def _descendant_ids(self, category_id: str, session: AsyncSession) -> list[str]:
        rows = await session.execute(select(CategoryModel.id, CategoryModel.parent_id))
        children: dict[str | None, list[str]] = {}
        for row_id, parent_id in rows:
            children.setdefault(parent_id, []).append(row_id)

        collected, frontier = [category_id], [category_id]
        while frontier:
            current = frontier.pop()
            for child in children.get(current, []):
                collected.append(child)
                frontier.append(child)
        return collected
```

then use `ProductModel.category_id.in_(await self._descendant_ids(category_id, session))` where the
filter is applied today. A recursive CTE would be the tidier version on Postgres
(`WITH RECURSIVE`), which is the production database.

**Two things to decide while doing it:** whether the storefront should be able to switch the roll-up off
(`?category_id=…&include_descendants=false`), and whether the *admin* listing should follow the same
rule — it has exactly the same exact-match filter today, which is why the back-office "filter by
category" only ever finds products sitting directly in it.

**Frontend impact:** the category page keeps working unchanged (it already links to its children); once
the backend rolls up, the child links become optional rather than necessary, and `lib/storefront-rules.ts`
plus §12 need the sentence about exact matching updated.

---

## 15. Serve uploaded images to the storefront

**Evidence** (live, anonymous):

```
GET /api/files/{id}/download   → 401 CREDENTIALS_VALIDATION_ERROR
GET /api/files/{id}/download   → 200 image/png        (as an admin with uploads:download)
GET /api/files/{id}            → 401                  (metadata is gated too)
```

`GET /api/catalog/products/?…` hands a shopper raw `gallery` / `image_gallery` **file ids** that their
browser cannot fetch, so product photos — the one thing every storefront is judged on — are invisible
without a session. The storefront currently renders a placeholder that says so
(`components/feature/storefront/ProductCard`), and a `banner` block only renders external URLs.

**Patch — new public controller `app/interface/controller/public_file_controller.py`:**

```python
@router.get("/{file_id}", response_class=FileResponse, summary="Publicly fetch an image file")
async def read_public_file(file_id: str, use_case: ReadPublicFileUseCase = Depends(get_read_public_file_use_case)):
    file = await use_case.execute(ReadPublicFileUseCaseRequest(file_id=file_id))
    return FileResponse(file.path, media_type=file.content_type, filename=file.original_name)
```

and an allow-list rule in the use case — serve only what a shopfront legitimately shows:

```python
    _PUBLIC_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp", "image/avif"}

    async def execute(self, request: ReadPublicFileUseCaseRequest) -> FileEntity:
        file = await self._file_repository.get_by_id(request.file_id)
        if file is None or file.content_type not in self._PUBLIC_CONTENT_TYPES:
            raise ResourceNotFoundException("File not found")
        return file
```

Mount it **outside** `/api` (e.g. `/media/{file_id}`) or keep `/api/files/{id}` gated and add
`/api/public/files/{id}`; either way the DTO that embeds file ids should also become a URL — a
`gallery` of ids forces every client to know the media route. Suggested field:
`gallery: list[str]` stays for the back office, and the public DTO gains
`gallery_urls: list[str]`.

**Frontend impact:** `components/feature/storefront/ProductCard` and `ProductDetail` swap their
placeholders for `<img src>` once the public projection carries URLs — one file each, no plumbing, since
the UI already receives what the API sends.

---

## 16. Stop accepting unvalidated `option_values` on SKU writes

**Evidence** (live):

```bash
# A SKU whose variant value is not an attribute of its category at all:
POST /api/products/{id}/skus/ {"code":"x","price_cents":100,"option_values":{"not-an-attribute-slug":"not-an-option"}}
# → 200, stored verbatim and later served in GET /api/catalog/products/{id}

# A value outside the definition's own choices:
POST /api/products/{id}/skus/ {"code":"y","price_cents":100,"option_values":{"<variant-slug>":"green"}}
# → 200 (choices are ["red","blue"])

# …and the same value does NOT satisfy the publish gate:
POST /api/products/{id}/publish
# → 422 VALIDATION_ERROR field=attribute_values "Required SKU attribute value is missing"
```

So a variant's attribute value can live in two places — the SKU's `option_values` column (unvalidated)
and the attribute-value table `…/skus/{id}/attribute-values/` (strictly validated against the
definition's type and `choices`) — and **only the second one publishes**. The storefront shows whatever
`option_values` holds, which means a shopper can be shown options the catalog never approved.

**Patch — `app/application/use_cases/sku/create_sku_use_case.py`** (and the update use case). Reuse the
attribute-value validator that already backs `…/attribute-values/`, keyed by slug:

```python
        if request.option_values:
            await self._attribute_value_service.validate_for_category(
                category_id=product.category_id,
                value_level="sku",
                values=request.option_values,   # {attribute_slug: value}
            )
```

If the attribute engine keeps `option_values` as a denormalised cache for display, write it **from** the
validated attribute values instead of accepting it from the request — that leaves one source of truth
and keeps the public DTO unchanged.

**Frontend impact:** none for the storefront (it renders what it is given). The back office already
writes SKU values through `…/attribute-values/`, so it stays correct either way — but the docs and
`lib/catalog-rules.ts` should then say that `option_values` on the SKU payload is read-only.

---

## 17. Free (or reach) SKU codes held by archived and deactivated rows

**Evidence** (live):

```bash
POST /api/products/ {slug:"x"}                      → 200
POST /api/products/{id}/skus/ {code:"REUSE-CODE"}   → 200
PUT  /api/products/{id}/skus/{sku} {is_active:false}→ 200   # the SKU disappears from every read
GET  /api/products/{id}/skus/                       → []    # …it really is gone
POST /api/products/{id}/skus/ {code:"REUSE-CODE"}   → 409 CONFLICT
        "SKU code, option combination or product relationship conflicts with existing data"
POST /api/products/{id}/skus/ {code:"REUSE-CODE", option_values:{…}} → 409 (same code, distinct options)

DELETE /api/products/{id}                           → 200 status=archived
GET  /api/products/                                 → the archived product is **not** listed
POST /api/products/ {slug:"x"}                      → 200  # the slug *can* be reused
POST /api/products/{new}/skus/ {code:"REUSE-CODE"}  → 409  # the code cannot
```

`DELETE /api/products/{id}` is a **soft archive**: the row stays with `status='archived'`, its SKUs stay
with `is_active=0`, and every read path filters them out — so from the API's point of view the product and
its SKUs are gone, while the database still holds their codes. `SkuModel.code` is `unique=True` with no
partial index, so those hidden rows claim their codes **permanently**: an admin who archives a product and
rebuilds it with the same SKU codes is blocked forever, and the only way out today is a different code or
SQL.

**Why it matters now.** The storefront and the order history will address SKUs by code (that is what a
merchant scans, prints on a label and types into a stock take). A database where a code can never come
back after a soft delete, and where the error does not say which code is taken, turns a normal
re-creation into a dead end.

**Patch — pick one policy and make it true.**

*(a) Scope the uniqueness to the product* (`alembic` migration + `models.py`), which makes codes
merchant-local:

```python
    __table_args__ = (
        UniqueConstraint("product_id", "option_signature"),
        UniqueConstraint("product_id", "code"),
    )
```

plus `code: Mapped[str] = mapped_column(String, index=True)` (drop `unique=True`).

*(b) Keep codes global and give them back.* Add a partial unique index so only live rows claim a code,
and let the create path **revive** a matching deactivated row instead of conflicting:

```python
Index("uq_commerce_skus_live_code", "code", unique=True, sqlite_where=..., postgresql_where=text("is_active"))
```

Whichever you pick, the `409` should name the conflict — the same request as follow-up **#9**:

```python
raise ConflictException(f"SKU code '{code}' is already used by another variant")
```

**Also worth an endpoint:** there is no way to reach an archived product or its SKUs at all — every read
filters them out and no `?status=archived` / purge path exists (`GET /api/products/?status=archived`
returns nothing because the base query excludes archived rows). The back office can therefore never show
a merchant what is holding a code, which is exactly what they will ask after the 409.

**Frontend impact:** the storefront is unaffected, but `scripts/seed-storefront-demo.mjs` and
`scripts/smoke-integration.mjs` both have to use run-unique SKU codes, and the docs' earlier note that
"archiving deletes the row" was wrong — it is corrected in this file. If (a) or (b) lands, the demo
seeder can go back to stable, readable codes.

---

## Smaller notes (no patch)

* **No upper bound on `size`.** `fastapi_pagination.Params` accepts any page size; consider
  `size: int = Query(50, ge=1, le=200)` on admin collections to bound response sizes.
* **Seed grants only `super:user`.** Every narrow-permission path needs manual role setup; a seeded
  read-only role would make permission testing a one-liner.
* **`/api/files` has no ownership scoping.** Any holder of `uploads:read` can list every uploaded file's
  metadata, and `uploads:download` downloads any file. Fine for an internal back office; worth a conscious
  decision if customer uploads are added later.
* **`GET /api/users/` returns full role objects per user**, so the admin list is chatty at larger page
  sizes. A `roles` projection or an include-parameter would help if the list grows.
* **Product `slug` is unique only while the product is not archived** (`uq_commerce_products_live_slug`),
  and the archived row keeps its data while disappearing from every read — so a slug is free again but a
  **SKU code is not** (follow-up #17). Worth keeping in mind before a storefront starts treating slugs as
  permanent, indexable URLs: right now its URLs are by id precisely because a slug can be reborn on a
  different product.
* **`GET /api/products/` can only filter by one category**, not a subtree (`category_id` matches exactly),
  so a storefront browsing a parent category has to enumerate descendants client-side or ask the public
  catalog endpoint instead.
* **Addresses are a flat list with a single default.** A customer can unset the default
  (`PUT {"is_default": false}`) and end up with none, and nothing auto-promotes another address when the
  default is deleted. `checkout` will have to cope with "no default".
* **Homepage `image_url` has no media story.** Until #15 lands, a `banner` block can only point at an
  external URL — an uploaded file's URL answers `401` for a shopper. The storefront renders the image
  only when it is an external `http(s)` URL and says why otherwise
  (`lib/storefront-rules.ts` → `isPubliclyRenderableImage`).
* **The public catalog's pagination bounds are pydantic, the rest are enveloped.** `?size=101` and
  `?page=0` on `/api/catalog/products/` answer `{detail:[{type:"less_than_equal", …}]}`, while the same
  mistake on `/api/products/` or `/api/homepage/blocks/` answers the project's own
  `VALIDATION_ERROR` envelope with `details.field`. Routing both through `_validate_page_size`, or
  through `fastapi_pagination` everywhere, would leave clients one dialect to handle.
* **`PUT /api/auth/me` has no email change** (the DTO forbids unknown fields). Changing an email needs a
  verification flow, which the backend does not model yet — worth deciding before the storefront ships its
  account page.
