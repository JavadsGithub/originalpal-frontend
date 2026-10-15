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
```

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
