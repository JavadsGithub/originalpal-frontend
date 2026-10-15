#!/usr/bin/env node
/**
 * Generates `lib/permissions.ts` from the backend's permission registry.
 *
 * The backend is the single source of truth (`statics/permissions.json` +
 * `app/infra/utils/auth/permission.py`, kept in sync there by `scripts/auth_manager.py --sync`).
 * This script mirrors that registry into the frontend, using the *same* key naming rule as the
 * backend's generated enum, so `Permissions.Users_Read` here means exactly what
 * `Permission.Users_Read` means there.
 *
 * Usage:
 *   node scripts/sync-permissions.mjs                      # snapshot -> lib/permissions.ts
 *   node scripts/sync-permissions.mjs --check              # CI gate, no writes
 *   node scripts/sync-permissions.mjs --from ../originalpal-server-python/statics/permissions.json
 *                                                          # refresh the snapshot, then generate
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SNAPSHOT_PATH = path.join(ROOT, "statics", "permissions.json");
const OUTPUT_PATH = path.join(ROOT, "lib", "permissions.ts");

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const fromIndex = args.indexOf("--from");
const fromPath = fromIndex !== -1 ? args[fromIndex + 1] : null;

if (fromIndex !== -1 && !fromPath) {
  fail("--from requires a path to the backend's statics/permissions.json");
}

function fail(message) {
  console.error(`\u001b[31m✖ ${message}\u001b[0m`);
  process.exit(1);
}

/**
 * Mirrors the backend's `scripts/auth_manager.py` naming rule:
 *   "super:user"                -> "Super_User"
 *   "roles:assign_permission"   -> "Roles_AssignPermission"
 *   "category-attributes:create" -> "CategoryAttributes_Create"
 */
function toPascalCase(segment) {
  return segment
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function keyFromTitle(title) {
  const [resource, ...actionParts] = title.split(":");
  const resourceKey = toPascalCase(resource);
  const actionKey = toPascalCase(actionParts.join(":"));
  return actionKey ? `${resourceKey}_${actionKey}` : resourceKey;
}

function escape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function renderModule(permissions) {
  const entries = permissions
    .map((permission) => ({ ...permission, key: keyFromTitle(permission.title) }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const duplicates = entries
    .map((entry) => entry.key)
    .filter((key, index, all) => all.indexOf(key) !== index);
  if (duplicates.length > 0) {
    fail(`Duplicate permission keys generated: ${[...new Set(duplicates)].join(", ")}`);
  }

  const permissionsObject = entries
    .map((entry) => `  ${entry.key}: "${escape(entry.id)}",`)
    .join("\n");

  const titlesObject = entries
    .map((entry) => `  ${entry.key}: "${escape(entry.title)}",`)
    .join("\n");

  const catalog = entries
    .map(
      (entry) =>
        `  {\n    key: "${entry.key}",\n    id: "${escape(entry.id)}",\n    title: "${escape(
          entry.title,
        )}",\n    description: "${escape(entry.description ?? "")}",\n  },`,
    )
    .join("\n");

  return `/**
 * AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Source: \`statics/permissions.json\`, a mirror of
 * \`originalpal-server-python/statics/permissions.json\` (the backend's own registry).
 *
 * Regenerate after the backend adds or renames a permission:
 *   pnpm permissions:sync
 *   pnpm permissions:sync -- --from ../originalpal-server-python/statics/permissions.json
 *
 * Verify without writing (CI):
 *   pnpm permissions:check
 *
 * ${entries.length} permissions.
 */

/** Permission ids keyed by the backend's generated enum names. */
export const Permissions = {
${permissionsObject}
} as const;

export type PermissionKey = keyof typeof Permissions;
export type PermissionId = (typeof Permissions)[PermissionKey];

/** Backend titles (\`resource:action\`) keyed the same way. */
export const PermissionTitles = {
${titlesObject}
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
${catalog}
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

/** \`resource:action\` title -> permission id. */
export function permissionIdByTitle(title: string): PermissionId | null {
  const key = TITLE_TO_KEY.get(title);
  return key ? Permissions[key] : null;
}

/** Permission id -> \`resource:action\` title. */
export function permissionTitleById(id: string): PermissionTitle | null {
  const key = ID_TO_KEY.get(id);
  return key ? PermissionTitles[key] : null;
}

/** Human readable label, e.g. \`users:read\` -> \`Users Read\`. */
export function permissionLabel(id: string): string {
  const title = permissionTitleById(id) ?? id;
  return title
    .split(":")
    .map((part) => part.replace(/[-_]/g, " "))
    .join(" ")
    .replace(/\\b\\w/g, (character) => character.toUpperCase());
}

/** The super-user permission bypasses every specific check on the backend. */
export function isSuperUserPermission(id: string | null | undefined): boolean {
  return id === Permissions.Super_User;
}
`;
}

const sourcePath = fromPath ? path.resolve(ROOT, fromPath) : SNAPSHOT_PATH;

if (!existsSync(sourcePath)) {
  fail(`Permission source not found: ${sourcePath}`);
}

const raw = await readFile(sourcePath, "utf8");
let parsed;
try {
  parsed = JSON.parse(raw);
} catch (error) {
  fail(`Invalid JSON in ${sourcePath}: ${error.message}`);
}

if (!Array.isArray(parsed) || parsed.length === 0) {
  fail(`${sourcePath} must contain a non-empty array of permissions`);
}

const permissions = parsed.map((permission, index) => {
  if (!permission?.id || !permission?.title) {
    fail(`Permission at index ${index} is missing "id" or "title"`);
  }
  return {
    id: permission.id,
    title: permission.title,
    description: permission.description ?? "",
  };
});

const generated = renderModule(permissions);

if (checkOnly) {
  if (!existsSync(OUTPUT_PATH)) {
    fail("lib/permissions.ts is missing — run `pnpm permissions:sync`");
  }
  const current = await readFile(OUTPUT_PATH, "utf8");
  if (current !== generated) {
    fail(
      "lib/permissions.ts is out of date with statics/permissions.json — run `pnpm permissions:sync`",
    );
  }
  console.log(
    `\u001b[32m✓ lib/permissions.ts matches ${permissions.length} backend permissions\u001b[0m`,
  );
  process.exit(0);
}

if (fromPath) {
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  console.log(
    `\u001b[32m✓ snapshot updated\u001b[0m statics/permissions.json (${permissions.length} permissions)`,
  );
}

await writeFile(OUTPUT_PATH, generated, "utf8");
console.log(
  `\u001b[32m✓ generated\u001b[0m lib/permissions.ts (${permissions.length} permissions)`,
);
