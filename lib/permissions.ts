/**
 * AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Source: `statics/permissions.json`, a mirror of
 * `originalpal-server-python/statics/permissions.json` (the backend's own registry).
 *
 * Regenerate after the backend adds or renames a permission:
 *   pnpm permissions:sync
 *   pnpm permissions:sync -- --from ../originalpal-server-python/statics/permissions.json
 *
 * Verify without writing (CI):
 *   pnpm permissions:check
 *
 * 49 permissions.
 */

/** Permission ids keyed by the backend's generated enum names. */
export const Permissions = {
  Attributes_Create: "a86511a0-6fbe-4894-8ed6-7c833fb9a7a4",
  Attributes_Delete: "16a64030-20ef-4f88-b600-a2d5416d7477",
  Attributes_Update: "77e96e35-658a-492c-87c0-9525ddff1848",
  AttributeValues_Create: "e47fb243-44be-4668-8777-2ce916906f1f",
  AttributeValues_Delete: "05f70c94-ebc0-44a6-95f9-79822136ee64",
  AttributeValues_Update: "b94f539d-a7f1-4ddb-8267-1d6506c8eb05",
  Brands_Create: "d3660d43-a1c1-46dc-9339-f19c2d72ee2d",
  Brands_Delete: "6960b988-5b93-47dd-ab0c-0fb4f854198a",
  Brands_Update: "b602b025-31ba-4330-ab73-bc0d2437af11",
  Categories_Create: "4630b922-4289-483f-9a4c-17f489e1606a",
  Categories_Delete: "a5c2ee6c-9842-44e9-971a-e47c6753660b",
  Categories_Update: "6c815206-998c-49e2-9eab-3634518b7cd0",
  CategoryAttributes_Create: "038604a2-3fc9-48b5-af79-2ce6b8b0c8e4",
  CategoryAttributes_Delete: "0023f2b4-36b2-4742-80b7-831da4a3685a",
  CategoryAttributes_Update: "726eee4b-754d-4e82-b466-f055355d17a3",
  Homepage_Create: "809a779a-5712-427d-93a9-cd6a85e30e6e",
  Homepage_Delete: "b584dc8a-3b57-49ee-a5b3-e96cdbe21caf",
  Homepage_Read: "f7542c52-f9b4-49e2-9d24-5cb1d5d0679d",
  Homepage_Update: "e3a3b52f-f6ac-4b76-8de3-9e3b06c9af7d",
  Orders_Cancel: "6c7b92af-3bbc-4d48-9729-2db056a9ef2b",
  Orders_Fulfill: "3dcc0071-c523-49b9-a6e8-efff6a417965",
  Orders_Read: "267390d1-cf03-4f7d-b6f8-22f3b88d4c7a",
  Orders_Refund: "22561bbd-e8a0-4dbd-a0c5-726be969f49a",
  Permissions_Read: "a7a7a152-0738-496a-893e-5beec67c349c",
  Products_Create: "7561076a-486c-4027-ad44-0bd159f3b13f",
  Products_Delete: "fe4d8b83-9460-4c26-ae97-c305fe378617",
  Products_Publish: "eae91a9d-a05c-4c8b-a194-15a2c627da6b",
  Products_Unpublish: "53c104aa-0568-4fb6-b490-98c1729bcddb",
  Products_Update: "f9e5c531-a94e-42c1-959d-a83a080243db",
  Roles_AssignPermission: "4ccef382-49a7-4a0c-8532-f9e1510345e8",
  Roles_Create: "5079a76b-427a-4a68-8178-dcf12d25915e",
  Roles_Delete: "27d97cc1-01d7-48e6-9644-955c884297ce",
  Roles_Read: "df372a87-6d17-481d-9a6c-002bb9590703",
  Roles_UnassignPermission: "1172ee5f-73f4-4333-b131-d168d8420375",
  Roles_Update: "e756611f-1311-4ce5-b470-0c39a947a782",
  Skus_Create: "73ec6c41-4e14-41fe-8619-24bce3817636",
  Skus_Delete: "361ecb4a-5005-4734-a55f-3eac334a860b",
  Skus_Update: "fc32689c-ce81-47af-aad2-b1141973e31f",
  Super_User: "708269c3-6740-445d-a528-ff88c60c7eb5",
  Uploads_Create: "d2ddfb9d-1184-4c77-925c-8c3198baddb8",
  Uploads_Delete: "c8818260-7b9f-4e71-af3f-fb71397b31c0",
  Uploads_Download: "65c5566d-a786-4948-8977-38f62121afd3",
  Uploads_Read: "84189e4d-326a-4a90-b50d-df875257982e",
  Users_AssignRole: "88cd4ed4-97d8-4265-88b2-bacaa44e16a9",
  Users_Create: "42a81114-3fe6-4b3e-86f9-d4ef14be65b2",
  Users_Delete: "cf9835c2-afe2-4504-891c-5c2cdb2fa5aa",
  Users_Read: "16d66325-e959-46d6-a538-69adb33418e1",
  Users_UnassignRole: "3920e61d-1d5f-4cae-ac5e-391a455e8e15",
  Users_Update: "9b21dc05-4483-4ee5-b2a8-1cb40ca3dd38",
} as const;

export type PermissionKey = keyof typeof Permissions;
export type PermissionId = (typeof Permissions)[PermissionKey];

/** Backend titles (`resource:action`) keyed the same way. */
export const PermissionTitles = {
  Attributes_Create: "attributes:create",
  Attributes_Delete: "attributes:delete",
  Attributes_Update: "attributes:update",
  AttributeValues_Create: "attribute-values:create",
  AttributeValues_Delete: "attribute-values:delete",
  AttributeValues_Update: "attribute-values:update",
  Brands_Create: "brands:create",
  Brands_Delete: "brands:delete",
  Brands_Update: "brands:update",
  Categories_Create: "categories:create",
  Categories_Delete: "categories:delete",
  Categories_Update: "categories:update",
  CategoryAttributes_Create: "category-attributes:create",
  CategoryAttributes_Delete: "category-attributes:delete",
  CategoryAttributes_Update: "category-attributes:update",
  Homepage_Create: "homepage:create",
  Homepage_Delete: "homepage:delete",
  Homepage_Read: "homepage:read",
  Homepage_Update: "homepage:update",
  Orders_Cancel: "orders:cancel",
  Orders_Fulfill: "orders:fulfill",
  Orders_Read: "orders:read",
  Orders_Refund: "orders:refund",
  Permissions_Read: "permissions:read",
  Products_Create: "products:create",
  Products_Delete: "products:delete",
  Products_Publish: "products:publish",
  Products_Unpublish: "products:unpublish",
  Products_Update: "products:update",
  Roles_AssignPermission: "roles:assign_permission",
  Roles_Create: "roles:create",
  Roles_Delete: "roles:delete",
  Roles_Read: "roles:read",
  Roles_UnassignPermission: "roles:unassign_permission",
  Roles_Update: "roles:update",
  Skus_Create: "skus:create",
  Skus_Delete: "skus:delete",
  Skus_Update: "skus:update",
  Super_User: "super:user",
  Uploads_Create: "uploads:create",
  Uploads_Delete: "uploads:delete",
  Uploads_Download: "uploads:download",
  Uploads_Read: "uploads:read",
  Users_AssignRole: "users:assign_role",
  Users_Create: "users:create",
  Users_Delete: "users:delete",
  Users_Read: "users:read",
  Users_UnassignRole: "users:unassign_role",
  Users_Update: "users:update",
} as const;

export type PermissionTitle = (typeof PermissionTitles)[PermissionKey];

export interface PermissionDescriptor {
  key: PermissionKey;
  id: PermissionId;
  title: PermissionTitle;
  description: string;
}

/** Full registry — useful for permission pickers and audit screens. */
export const permissionCatalog: readonly PermissionDescriptor[] = [
  {
    key: "Attributes_Create",
    id: "a86511a0-6fbe-4894-8ed6-7c833fb9a7a4",
    title: "attributes:create",
    description: "Create reusable commerce attribute definitions",
  },
  {
    key: "Attributes_Delete",
    id: "16a64030-20ef-4f88-b600-a2d5416d7477",
    title: "attributes:delete",
    description: "Delete reusable commerce attribute definitions",
  },
  {
    key: "Attributes_Update",
    id: "77e96e35-658a-492c-87c0-9525ddff1848",
    title: "attributes:update",
    description: "Update reusable commerce attribute definitions",
  },
  {
    key: "AttributeValues_Create",
    id: "e47fb243-44be-4668-8777-2ce916906f1f",
    title: "attribute-values:create",
    description: "Create product and SKU attribute values",
  },
  {
    key: "AttributeValues_Delete",
    id: "05f70c94-ebc0-44a6-95f9-79822136ee64",
    title: "attribute-values:delete",
    description: "Delete product and SKU attribute values",
  },
  {
    key: "AttributeValues_Update",
    id: "b94f539d-a7f1-4ddb-8267-1d6506c8eb05",
    title: "attribute-values:update",
    description: "Update product and SKU attribute values",
  },
  {
    key: "Brands_Create",
    id: "d3660d43-a1c1-46dc-9339-f19c2d72ee2d",
    title: "brands:create",
    description: "Create commerce brands",
  },
  {
    key: "Brands_Delete",
    id: "6960b988-5b93-47dd-ab0c-0fb4f854198a",
    title: "brands:delete",
    description: "Delete commerce brands",
  },
  {
    key: "Brands_Update",
    id: "b602b025-31ba-4330-ab73-bc0d2437af11",
    title: "brands:update",
    description: "Update commerce brands",
  },
  {
    key: "Categories_Create",
    id: "4630b922-4289-483f-9a4c-17f489e1606a",
    title: "categories:create",
    description: "Create merchandise categories",
  },
  {
    key: "Categories_Delete",
    id: "a5c2ee6c-9842-44e9-971a-e47c6753660b",
    title: "categories:delete",
    description: "Delete merchandise categories",
  },
  {
    key: "Categories_Update",
    id: "6c815206-998c-49e2-9eab-3634518b7cd0",
    title: "categories:update",
    description: "Update merchandise categories",
  },
  {
    key: "CategoryAttributes_Create",
    id: "038604a2-3fc9-48b5-af79-2ce6b8b0c8e4",
    title: "category-attributes:create",
    description: "Attach reusable attribute definitions to merchandise categories",
  },
  {
    key: "CategoryAttributes_Delete",
    id: "0023f2b4-36b2-4742-80b7-831da4a3685a",
    title: "category-attributes:delete",
    description: "Remove merchandise category attribute applicability",
  },
  {
    key: "CategoryAttributes_Update",
    id: "726eee4b-754d-4e82-b466-f055355d17a3",
    title: "category-attributes:update",
    description: "Update merchandise category attribute applicability",
  },
  {
    key: "Homepage_Create",
    id: "809a779a-5712-427d-93a9-cd6a85e30e6e",
    title: "homepage:create",
    description: "Create homepage blocks",
  },
  {
    key: "Homepage_Delete",
    id: "b584dc8a-3b57-49ee-a5b3-e96cdbe21caf",
    title: "homepage:delete",
    description: "Delete homepage blocks",
  },
  {
    key: "Homepage_Read",
    id: "f7542c52-f9b4-49e2-9d24-5cb1d5d0679d",
    title: "homepage:read",
    description: "Read homepage block administration",
  },
  {
    key: "Homepage_Update",
    id: "e3a3b52f-f6ac-4b76-8de3-9e3b06c9af7d",
    title: "homepage:update",
    description: "Update homepage blocks",
  },
  {
    key: "Orders_Cancel",
    id: "6c7b92af-3bbc-4d48-9729-2db056a9ef2b",
    title: "orders:cancel",
    description: "Cancel commerce orders",
  },
  {
    key: "Orders_Fulfill",
    id: "3dcc0071-c523-49b9-a6e8-efff6a417965",
    title: "orders:fulfill",
    description: "Move commerce orders through fulfillment",
  },
  {
    key: "Orders_Read",
    id: "267390d1-cf03-4f7d-b6f8-22f3b88d4c7a",
    title: "orders:read",
    description: "Read and search commerce orders",
  },
  {
    key: "Orders_Refund",
    id: "22561bbd-e8a0-4dbd-a0c5-726be969f49a",
    title: "orders:refund",
    description: "Record commerce order refunds",
  },
  {
    key: "Permissions_Read",
    id: "a7a7a152-0738-496a-893e-5beec67c349c",
    title: "permissions:read",
    description: "Ability to read permissions",
  },
  {
    key: "Products_Create",
    id: "7561076a-486c-4027-ad44-0bd159f3b13f",
    title: "products:create",
    description: "Create catalog products",
  },
  {
    key: "Products_Delete",
    id: "fe4d8b83-9460-4c26-ae97-c305fe378617",
    title: "products:delete",
    description: "Archive catalog products",
  },
  {
    key: "Products_Publish",
    id: "eae91a9d-a05c-4c8b-a194-15a2c627da6b",
    title: "products:publish",
    description: "Publish catalog products",
  },
  {
    key: "Products_Unpublish",
    id: "53c104aa-0568-4fb6-b490-98c1729bcddb",
    title: "products:unpublish",
    description: "Unpublish catalog products",
  },
  {
    key: "Products_Update",
    id: "f9e5c531-a94e-42c1-959d-a83a080243db",
    title: "products:update",
    description: "Update catalog products",
  },
  {
    key: "Roles_AssignPermission",
    id: "4ccef382-49a7-4a0c-8532-f9e1510345e8",
    title: "roles:assign_permission",
    description: "Ability to assign permissions to roles",
  },
  {
    key: "Roles_Create",
    id: "5079a76b-427a-4a68-8178-dcf12d25915e",
    title: "roles:create",
    description: "Ability to create roles",
  },
  {
    key: "Roles_Delete",
    id: "27d97cc1-01d7-48e6-9644-955c884297ce",
    title: "roles:delete",
    description: "Ability to delete roles",
  },
  {
    key: "Roles_Read",
    id: "df372a87-6d17-481d-9a6c-002bb9590703",
    title: "roles:read",
    description: "Ability to read roles",
  },
  {
    key: "Roles_UnassignPermission",
    id: "1172ee5f-73f4-4333-b131-d168d8420375",
    title: "roles:unassign_permission",
    description: "Ability to remove permissions from roles",
  },
  {
    key: "Roles_Update",
    id: "e756611f-1311-4ce5-b470-0c39a947a782",
    title: "roles:update",
    description: "Ability to update roles",
  },
  {
    key: "Skus_Create",
    id: "73ec6c41-4e14-41fe-8619-24bce3817636",
    title: "skus:create",
    description: "Create product SKUs",
  },
  {
    key: "Skus_Delete",
    id: "361ecb4a-5005-4734-a55f-3eac334a860b",
    title: "skus:delete",
    description: "Deactivate product SKUs",
  },
  {
    key: "Skus_Update",
    id: "fc32689c-ce81-47af-aad2-b1141973e31f",
    title: "skus:update",
    description: "Update product SKUs",
  },
  {
    key: "Super_User",
    id: "708269c3-6740-445d-a528-ff88c60c7eb5",
    title: "super:user",
    description: "Ability to do anything",
  },
  {
    key: "Uploads_Create",
    id: "d2ddfb9d-1184-4c77-925c-8c3198baddb8",
    title: "uploads:create",
    description: "Ability to upload files",
  },
  {
    key: "Uploads_Delete",
    id: "c8818260-7b9f-4e71-af3f-fb71397b31c0",
    title: "uploads:delete",
    description: "Ability to delete uploaded files",
  },
  {
    key: "Uploads_Download",
    id: "65c5566d-a786-4948-8977-38f62121afd3",
    title: "uploads:download",
    description: "Ability to download uploaded files",
  },
  {
    key: "Uploads_Read",
    id: "84189e4d-326a-4a90-b50d-df875257982e",
    title: "uploads:read",
    description: "Ability to read uploaded file metadata",
  },
  {
    key: "Users_AssignRole",
    id: "88cd4ed4-97d8-4265-88b2-bacaa44e16a9",
    title: "users:assign_role",
    description: "Ability to assign roles to users",
  },
  {
    key: "Users_Create",
    id: "42a81114-3fe6-4b3e-86f9-d4ef14be65b2",
    title: "users:create",
    description: "Ability to create users",
  },
  {
    key: "Users_Delete",
    id: "cf9835c2-afe2-4504-891c-5c2cdb2fa5aa",
    title: "users:delete",
    description: "Ability to remove users",
  },
  {
    key: "Users_Read",
    id: "16d66325-e959-46d6-a538-69adb33418e1",
    title: "users:read",
    description: "Ability to read users",
  },
  {
    key: "Users_UnassignRole",
    id: "3920e61d-1d5f-4cae-ac5e-391a455e8e15",
    title: "users:unassign_role",
    description: "Ability to remove roles from users",
  },
  {
    key: "Users_Update",
    id: "9b21dc05-4483-4ee5-b2a8-1cb40ca3dd38",
    title: "users:update",
    description: "Ability to update users",
  },
];

const ID_TO_KEY = new Map<string, PermissionKey>(
  Object.entries(Permissions).map(([key, id]) => [id, key as PermissionKey]),
);

const TITLE_TO_KEY = new Map<string, PermissionKey>(
  Object.entries(PermissionTitles).map(([key, title]) => [title, key as PermissionKey]),
);

/** True when the value is one of the backend's permission ids. */
export function isPermissionId(value: unknown): value is PermissionId {
  return typeof value === "string" && ID_TO_KEY.has(value);
}

/** `resource:action` title -> permission id. */
export function permissionIdByTitle(title: string): PermissionId | null {
  const key = TITLE_TO_KEY.get(title);
  return key ? Permissions[key] : null;
}

/** Permission id -> `resource:action` title. */
export function permissionTitleById(id: string): PermissionTitle | null {
  const key = ID_TO_KEY.get(id);
  return key ? PermissionTitles[key] : null;
}

/** Human readable label, e.g. `users:read` -> `Users Read`. */
export function permissionLabel(id: string): string {
  const title = permissionTitleById(id) ?? id;
  return title
    .split(":")
    .map((part) => part.replace(/[-_]/g, " "))
    .join(" ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/** The super-user permission bypasses every specific check on the backend. */
export function isSuperUserPermission(id: string | null | undefined): boolean {
  return id === Permissions.Super_User;
}
