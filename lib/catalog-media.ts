import { PUBLIC_API_BASE_URL } from "@/lib/config";

/**
 * Media helpers.
 *
 * There is **no public route to read an uploaded file back**: the only way is
 * `GET /api/files/{id}/download`, which requires the `uploads:download` permission (see
 * `docs/integration/backend-follow-ups/README.md` — a storefront cannot render these images yet).
 * The admin screens therefore link through that endpoint and say so in the copy, rather than
 * pretending a `/media/...` URL exists.
 */

/** URL of the permission-gated download endpoint, resolved against the configured API base. */
export function fileDownloadUrl(fileId: string): string {
  return `${PUBLIC_API_BASE_URL.replace(/\/+$/, "")}/files/${fileId}/download`;
}

/** `1536` → `"1.5 KB"`. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

/** Splits `"photo.png"` into a name and a short extension badge. */
export function fileExtensionLabel(originalName: string): string {
  const parts = originalName.split(".");
  return parts.length > 1 ? (parts.at(-1) as string).toLowerCase() : "file";
}
