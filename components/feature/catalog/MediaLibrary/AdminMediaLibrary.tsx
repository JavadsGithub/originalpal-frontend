"use client";

import { useState } from "react";
import useGetFiles from "@/data/feature/catalog/useGetFiles";
import useUploadFile from "@/data/feature/catalog/useUploadFile";
import useDeleteFile from "@/data/feature/catalog/useDeleteFile";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import type { ApiError } from "@/lib/api-error";
import { fileDownloadUrl, fileExtensionLabel, formatFileSize } from "@/lib/catalog-media";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import MediaLibraryUI, { type MediaItem } from "./index";

/**
 * Tier 2 injector for the media library.
 *
 * Permissions: `uploads:read` to list, `uploads:create` to upload, `uploads:delete` to remove.
 * Downloading (both the link and the thumbnail) needs `uploads:download`, so a caller without it
 * sees broken previews — the copy in `MediaLibraryUI` says why.
 */
export default function AdminMediaLibrary() {
  const { hasPermission, isSuperUser } = useAuth();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { files, total, isLoading, isError, error: loadError, refetch } = useGetFiles({ page: 1, size: 100 });
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();

  const canUpload = isSuperUser || hasPermission(Permissions.Uploads_Create);
  const canDelete = isSuperUser || hasPermission(Permissions.Uploads_Delete);

  const items: MediaItem[] = files.map((file) => ({
    id: file.id,
    originalName: file.original_name,
    contentType: file.content_type,
    sizeLabel: formatFileSize(file.size),
    extension: fileExtensionLabel(file.original_name),
    createdAt: file.created_at,
    downloadUrl: fileDownloadUrl(file.id),
    isImage: Boolean(file.content_type?.startsWith("image/")),
  }));

  const handleUpload = (file: File) => {
    setError(null);
    setProgress(0);

    uploadFile.mutate(
      { file, onProgress: setProgress },
      { onError: setError, onSettled: () => setProgress(0) },
    );
  };

  const handleDelete = (fileId: string) => {
    setError(null);

    deleteFile.mutate(fileId, {
      onSuccess: () => setPendingDelete(null),
      onError: setError,
    });
  };

  if (isLoading) {
    return (
      <div
        data-testid="media-library-loading"
        className="flex h-48 items-center justify-center text-sm text-muted-foreground"
      >
        Loading media...
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-testid="media-library-error"
        className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
      >
        <p>{loadError?.message ?? "Failed to load the media library"}</p>
        <button
          type="button"
          onClick={refetch}
          className="rounded-md border border-current/40 px-2.5 py-1 text-xs font-semibold hover:opacity-80"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <MediaLibraryUI
        items={items}
        total={total}
        uploading={uploadFile.isPending}
        uploadProgress={progress}
        busyFileId={deleteFile.isPending ? (deleteFile.variables ?? null) : null}
        canUpload={canUpload}
        canDelete={canDelete}
        errorMessage={error?.message ?? null}
        callbacks={{ onUpload: handleUpload, onDelete: setPendingDelete }}
      />

      {pendingDelete && (
        <ConfirmDialog
          open
          destructive
          busy={deleteFile.isPending}
          title="Delete this file?"
          description="Products that still reference the id in a gallery will show a broken image."
          translations={{ confirmButtonText: "Delete file" }}
          callbacks={{
            onConfirm: () => handleDelete(pendingDelete),
            onCancel: () => setPendingDelete(null),
          }}
        />
      )}
    </>
  );
}
