# Endpoint → permission map

Authoritative mapping extracted from `originalpal-server-python` @ `3d82827` (`app/interface/controller/*.py`,
`get_authorized_user([...])` dependencies). Use it to decide which `PermissionGate` / `AuthGuard` a screen needs.

* **Public** — no token required. Useful to know: catalog *reads*, carts, checkout and order-by-id are public.
* **Auth** — any valid access token; no specific permission (the frontend only has to be signed in).
* **Permission** — the listed ids (from `lib/permissions.ts`); `super:user` bypasses them all.
* 401 = no/invalid token, 403 = token valid but permission missing.

## Auth & session

| Method | Path | Required |
| --- | --- | --- |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Public |
| GET | `/api/auth/me` | Auth |
| PUT | `/api/auth/me` | Auth |
| GET | `/api/auth/permissions` | `Permissions_Read` |
| POST | `/api/auth/recovery/request` | Public |
| POST | `/api/auth/recovery/reset` | Public |
| POST | `/api/auth/refresh` | Public |
| POST | `/api/auth/register` | Public |


## Customer account & addresses

| Method | Path | Required |
| --- | --- | --- |
| POST | `/api/me/addresses/` | Auth |
| GET | `/api/me/addresses/` | Auth |
| GET | `/api/me/addresses/{address_id}` | Auth |
| PUT | `/api/me/addresses/{address_id}` | Auth |
| DELETE | `/api/me/addresses/{address_id}` | Auth |
| GET | `/api/me/orders/` | Auth |
| POST | `/api/me/orders/guest-associations/confirm` | Auth |
| POST | `/api/me/orders/guest-associations/request` | Auth |
| GET | `/api/me/orders/{order_id}` | Auth |
| POST | `/api/me/orders/{order_id}/cancel` | Auth |


## Users & roles (admin)

| Method | Path | Required |
| --- | --- | --- |
| GET | `/api/roles/` | `Roles_Read` |
| POST | `/api/roles/` | `Roles_Create` |
| GET | `/api/roles/{role_id}` | `Roles_Read` |
| PUT | `/api/roles/{role_id}` | `Roles_Update` |
| DELETE | `/api/roles/{role_id}` | `Roles_Delete` |
| POST | `/api/roles/{role_id}/permissions/{permission_id}` | `Roles_AssignPermission` |
| DELETE | `/api/roles/{role_id}/permissions/{permission_id}` | `Roles_UnassignPermission` |
| GET | `/api/users/` | `Users_Read` |
| POST | `/api/users/` | `Users_Create` |
| GET | `/api/users/{user_id}` | `Users_Read` |
| PUT | `/api/users/{user_id}` | `Users_Update` |
| DELETE | `/api/users/{user_id}` | `Users_Delete` |
| POST | `/api/users/{user_id}/roles/{role_id}` | `Users_AssignRole` |
| DELETE | `/api/users/{user_id}/roles/{role_id}` | `Users_UnassignRole` |


## Catalog management

| Method | Path | Required |
| --- | --- | --- |
| GET | `/api/attributes/` | Public |
| POST | `/api/attributes/` | `Attributes_Create` |
| GET | `/api/attributes/{definition_id}` | Public |
| PUT | `/api/attributes/{definition_id}` | `Attributes_Update` |
| DELETE | `/api/attributes/{definition_id}` | `Attributes_Delete` |
| GET | `/api/brands/` | Public |
| POST | `/api/brands/` | `Brands_Create` |
| GET | `/api/brands/{brand_id}` | Public |
| PUT | `/api/brands/{brand_id}` | `Brands_Update` |
| DELETE | `/api/brands/{brand_id}` | `Brands_Delete` |
| GET | `/api/categories/` | Public |
| POST | `/api/categories/` | `Categories_Create` |
| GET | `/api/categories/{category_id}` | Public |
| PUT | `/api/categories/{category_id}` | `Categories_Update` |
| DELETE | `/api/categories/{category_id}` | `Categories_Delete` |
| GET | `/api/categories/{category_id}/attributes/` | Public |
| POST | `/api/categories/{category_id}/attributes/` | `CategoryAttributes_Create` |
| GET | `/api/categories/{category_id}/attributes/{item_id}` | Public |
| PUT | `/api/categories/{category_id}/attributes/{item_id}` | `CategoryAttributes_Update` |
| DELETE | `/api/categories/{category_id}/attributes/{item_id}` | `CategoryAttributes_Delete` |
| GET | `/api/products/` | Public |
| POST | `/api/products/` | `Products_Create` |
| GET | `/api/products/{product_id}` | Public |
| PUT | `/api/products/{product_id}` | `Products_Update` |
| DELETE | `/api/products/{product_id}` | `Products_Delete` |
| GET | `/api/products/{product_id}/attribute-values/` | Public |
| POST | `/api/products/{product_id}/attribute-values/` | `AttributeValues_Create` |
| GET | `/api/products/{product_id}/attribute-values/{item_id}` | Public |
| PUT | `/api/products/{product_id}/attribute-values/{item_id}` | `AttributeValues_Update` |
| DELETE | `/api/products/{product_id}/attribute-values/{item_id}` | `AttributeValues_Delete` |
| POST | `/api/products/{product_id}/publish` | `Products_Publish` |
| GET | `/api/products/{product_id}/skus/` | Public |
| POST | `/api/products/{product_id}/skus/` | `Skus_Create` |
| GET | `/api/products/{product_id}/skus/{sku_id}` | Public |
| PUT | `/api/products/{product_id}/skus/{sku_id}` | `Skus_Update` |
| DELETE | `/api/products/{product_id}/skus/{sku_id}` | `Skus_Delete` |
| GET | `/api/products/{product_id}/skus/{sku_id}/attribute-values/` | Public |
| POST | `/api/products/{product_id}/skus/{sku_id}/attribute-values/` | `AttributeValues_Create` |
| GET | `/api/products/{product_id}/skus/{sku_id}/attribute-values/{item_id}` | Public |
| PUT | `/api/products/{product_id}/skus/{sku_id}/attribute-values/{item_id}` | `AttributeValues_Update` |
| DELETE | `/api/products/{product_id}/skus/{sku_id}/attribute-values/{item_id}` | `AttributeValues_Delete` |
| POST | `/api/products/{product_id}/skus/{sku_id}/stock-adjustments` | `Skus_Update` |
| GET | `/api/products/{product_id}/skus/{sku_id}/stock-adjustments` | `Skus_Update` |
| POST | `/api/products/{product_id}/unpublish` | `Products_Unpublish` |


## Public catalog & homepage

| Method | Path | Required |
| --- | --- | --- |
| GET | `/api/catalog/products/` | Public |
| GET | `/api/catalog/products/{product_id}` | Public |
| GET | `/api/delivery/options` | Public |
| GET | `/api/homepage/` | Public |
| GET | `/api/homepage/blocks/` | `Homepage_Read` |
| POST | `/api/homepage/blocks/` | `Homepage_Create` |
| GET | `/api/homepage/blocks/{block_id}` | `Homepage_Read` |
| PUT | `/api/homepage/blocks/{block_id}` | `Homepage_Update` |
| DELETE | `/api/homepage/blocks/{block_id}` | `Homepage_Delete` |


## Carts, checkout & orders

| Method | Path | Required |
| --- | --- | --- |
| POST | `/api/carts/` | Public |
| GET | `/api/carts/{cart_id}` | Public |
| POST | `/api/carts/{cart_id}/lines/` | Public |
| PUT | `/api/carts/{cart_id}/lines/{line_id}` | Public |
| DELETE | `/api/carts/{cart_id}/lines/{line_id}` | Public |
| POST | `/api/checkouts/` | Public |
| GET | `/api/orders/` | `Orders_Read` |
| GET | `/api/orders/{order_id}` | Public |
| GET | `/api/orders/{order_id}/admin` | `Orders_Read` |
| POST | `/api/orders/{order_id}/cancel` | `Orders_Cancel` |
| POST | `/api/orders/{order_id}/deliver` | `Orders_Fulfill` |
| POST | `/api/orders/{order_id}/guest-cancel` | Public |
| GET | `/api/orders/{order_id}/messages/` | `Orders_Read` |
| GET | `/api/orders/{order_id}/messages/{message_id}` | `Orders_Read` |
| POST | `/api/orders/{order_id}/messages/{message_id}/retry` | `Orders_Fulfill` |
| POST | `/api/orders/{order_id}/payment-attempts/` | Public |
| GET | `/api/orders/{order_id}/payment-attempts/` | Public |
| GET | `/api/orders/{order_id}/payment-attempts/{attempt_id}` | Public |
| POST | `/api/orders/{order_id}/processing` | `Orders_Fulfill` |
| POST | `/api/orders/{order_id}/refund` | `Orders_Refund` |
| POST | `/api/orders/{order_id}/ship` | `Orders_Fulfill` |
| POST | `/api/payment-attempts/{attempt_id}/verify` | Public |


## Uploads

| Method | Path | Required |
| --- | --- | --- |
| GET | `/api/files` | `Uploads_Read` |
| GET | `/api/files/{file_id}` | `Uploads_Read` |
| DELETE | `/api/files/{file_id}` | `Uploads_Delete` |
| GET | `/api/files/{file_id}/download` | `Uploads_Download` |
| POST | `/api/upload` | `Uploads_Create` |


## System

| Method | Path | Required |
| --- | --- | --- |
| GET | `/api/ping` | Public |


**Totals:** 114 operations — 63 permission-gated, 12 auth-only, 39 public.
