"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";

export interface MediaItem {
  id: string;
  originalName: string;
  contentType: string | null;
  sizeLabel: string;
  extension: string;
  createdAt: string;
  downloadUrl: string;
  /** True when the browser can display it as an image. */
  isImage: boolean;
}

export interface MediaLibraryTranslations {
  title: string;
  subtitle: string;
  uploadLabel: string;
  uploadButtonText: string;
  uploadingLabel: string;
  noFiles: string;
  downloadButtonText: string;
  deleteButtonText: string;
  copyIdButtonText: string;
  copiedLabel: string;
  downloadNeedsPermission: string;
  sizeLimitHint: string;
  idLabel: string;
  totalLabel: string;
}

export interface MediaLibraryCallbacks {
  onUpload: (file: File) => void;
  onDelete: (fileId: string) => void;
}

export interface MediaLibraryUIProps {
  items: MediaItem[];
  total: number;
  uploading?: boolean;
  uploadProgress?: number;
  busyFileId?: string | null;
  canUpload: boolean;
  canDelete: boolean;
  errorMessage?: string | null;
  translations?: Partial<MediaLibraryTranslations>;
  callbacks: MediaLibraryCallbacks;
}

const defaultTranslations: MediaLibraryTranslations = {
  title: "Media",
  subtitle:
    "Uploads live outside the catalog. Products reference them by id, so keep the ids you paste into a gallery.",
  uploadLabel: "Upload file",
  uploadButtonText: "Upload",
  uploadingLabel: "Uploading...",
  noFiles: "No files uploaded yet.",
  downloadButtonText: "Download",
  deleteButtonText: "Delete",
  copyIdButtonText: "Copy id",
  copiedLabel: "Copied",
  downloadNeedsPermission:
    "Reading a file back needs `uploads:download` — there is no public URL (see the backend follow-ups).",
  sizeLimitHint: "Uploads must be non-empty and within the backend's 10 MB limit.",
  idLabel: "Id",
  totalLabel: "total",
};

/**
 * Tier 1 pure UI for the media library.
 *
 * Uploads are a single `POST /api/upload` (multipart, answers 201) and the response's `id` is what
 * a product/SKU gallery stores; the library therefore leads with the id rather than a URL.
 */
export default function MediaLibraryUI({
  items,
  total,
  uploading = false,
  uploadProgress = 0,
  busyFileId = null,
  canUpload,
  canDelete,
  errorMessage = null,
  translations = {},
  callbacks,
}: MediaLibraryUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  return (
    <section className="space-y-4" data-testid="media-library">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <span className="text-xs text-muted-foreground" data-testid="media-total">
          {total} {t.totalLabel}
        </span>
      </header>

      <FormError message={errorMessage} />

      {canUpload && (
        <form
          className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (selectedFile) callbacks.onUpload(selectedFile);
          }}
        >
          <label className="text-xs font-semibold text-foreground" htmlFor="media-upload">
            {t.uploadLabel}
          </label>
          <input
            id="media-upload"
            type="file"
            disabled={uploading}
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            className="text-xs text-muted-foreground"
          />
          <Button type="submit" size="sm" disabled={uploading || !selectedFile}>
            {uploading ? t.uploadingLabel : t.uploadButtonText}
          </Button>
          {uploading && uploadProgress > 0 && (
            <span className="text-xs text-muted-foreground">
              {Math.round(uploadProgress * 100)}%
            </span>
          )}
          <p className="w-full text-xs text-muted-foreground">{t.sizeLimitHint}</p>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noFiles}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.id}
              data-testid={`media-item-${item.id}`}
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                {item.isImage ? (
                  // Plain <img>: uploads are served by the backend, not by next/image's optimizer.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.downloadUrl}
                    alt={item.originalName}
                    className="size-12 rounded border border-border object-cover"
                  />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded border border-border bg-muted text-[0.6rem] font-semibold uppercase text-muted-foreground">
                    {item.extension}
                  </span>
                )}

                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm text-foreground" title={item.originalName}>
                    {item.originalName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.sizeLabel} · {item.contentType ?? "unknown type"}
                  </p>
                </div>
              </div>

              <p className="truncate font-mono text-[0.65rem] text-muted-foreground">
                {t.idLabel}: {item.id}
              </p>

              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(item.id);
                    setCopiedId(item.id);
                  }}
                >
                  {copiedId === item.id ? t.copiedLabel : t.copyIdButtonText}
                </Button>
                <a
                  href={item.downloadUrl}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  {t.downloadButtonText}
                </a>
                {canDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    disabled={busyFileId === item.id}
                    onClick={() => callbacks.onDelete(item.id)}
                  >
                    {t.deleteButtonText}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">{t.downloadNeedsPermission}</p>
    </section>
  );
}
