"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";

export interface MediaPickerItem {
  id: string;
  originalName: string;
  sizeLabel: string;
  downloadUrl: string;
  isImage: boolean;
  extension: string;
}

export interface MediaPickerDialogTranslations {
  title: string;
  description: string;
  empty: string;
  selectedLabel: string;
  confirmButtonText: string;
  cancelButtonText: string;
  previewUnavailable: string;
}

export interface MediaPickerDialogCallbacks {
  onToggle: (fileId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface MediaPickerDialogUIProps {
  items: MediaPickerItem[];
  selectedIds: string[];
  canDownload: boolean;
  translations?: Partial<MediaPickerDialogTranslations>;
  callbacks: MediaPickerDialogCallbacks;
}

const defaultTranslations: MediaPickerDialogTranslations = {
  title: "Choose media",
  description: "Pick the uploads to reference from this gallery, in the order they were selected.",
  empty: "The media library is empty — upload a file first.",
  selectedLabel: "selected",
  confirmButtonText: "Use selection",
  cancelButtonText: "Cancel",
  previewUnavailable: "preview needs uploads:download",
};

/**
 * Tier 1 pure UI for picking upload ids.
 *
 * Galleries store file **ids**, not URLs: the backend's only read path is
 * `GET /api/files/{id}/download`, guarded by `uploads:download`. Without that permission the
 * previews are skipped and the id is shown instead of pretending there is a public URL.
 */
export default function MediaPickerDialogUI({
  items,
  selectedIds,
  canDownload,
  translations = {},
  callbacks,
}: MediaPickerDialogUIProps) {
  const t = { ...defaultTranslations, ...translations };

  return (
    <Dialog
      open
      onClose={callbacks.onCancel}
      title={t.title}
      description={t.description}
      className="w-[min(40rem,calc(100vw-2rem))]"
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={callbacks.onCancel}>
            {t.cancelButtonText}
          </Button>
          <Button type="button" size="sm" onClick={callbacks.onConfirm}>
            {t.confirmButtonText}
          </Button>
        </>
      }
    >
      <div className="space-y-3" data-testid="media-picker-dialog">
        <p className="text-xs text-muted-foreground">
          {selectedIds.length} {t.selectedLabel}
        </p>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);

              return (
                <li
                  key={item.id}
                  data-testid={`media-option-${item.id}`}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                >
                  {item.isImage && canDownload ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.downloadUrl}
                      alt={item.originalName}
                      className="size-10 rounded border border-border object-cover"
                    />
                  ) : (
                    <span className="flex size-10 items-center justify-center rounded border border-border bg-muted text-[0.55rem] font-semibold uppercase text-muted-foreground">
                      {item.extension}
                    </span>
                  )}

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-xs text-foreground" title={item.originalName}>
                      {item.originalName}
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground">
                      {item.sizeLabel}
                      {!canDownload && ` · ${t.previewUnavailable}`}
                    </p>
                  </div>

                  <Checkbox
                    aria-label={item.originalName}
                    checked={isSelected}
                    onChange={() => callbacks.onToggle(item.id)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
