"use client";

import { useState } from "react";
import useGetFiles from "@/data/feature/catalog/useGetFiles";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import { fileDownloadUrl, fileExtensionLabel, formatFileSize } from "@/lib/catalog-media";
import MediaPickerDialogUI, { type MediaPickerItem } from "./index";

export interface MediaPickerDialogProps {
  initialSelection: string[];
  onConfirm: (fileIds: string[]) => void;
  onCancel: () => void;
}

/**
 * Tier 2 injector: loads the media library (`GET /api/files`, needs `uploads:read`) and returns the
 * chosen ids in selection order, which is the order the storefront will show the gallery in.
 */
export default function MediaPickerDialog({
  initialSelection,
  onConfirm,
  onCancel,
}: MediaPickerDialogProps) {
  const { hasPermission, isSuperUser } = useAuth();
  const [selection, setSelection] = useState<string[]>(initialSelection);

  const { files } = useGetFiles({ page: 1, size: 100 });
  const canDownload = isSuperUser || hasPermission(Permissions.Uploads_Download);

  const items: MediaPickerItem[] = files.map((file) => ({
    id: file.id,
    originalName: file.original_name,
    sizeLabel: formatFileSize(file.size),
    downloadUrl: fileDownloadUrl(file.id),
    isImage: Boolean(file.content_type?.startsWith("image/")),
    extension: fileExtensionLabel(file.original_name),
  }));

  return (
    <MediaPickerDialogUI
      items={items}
      selectedIds={selection}
      canDownload={canDownload}
      callbacks={{
        onToggle: (fileId) =>
          setSelection((current) =>
            current.includes(fileId)
              ? current.filter((id) => id !== fileId)
              : [...current, fileId],
          ),
        onConfirm: () => onConfirm(selection),
        onCancel,
      }}
    />
  );
}
