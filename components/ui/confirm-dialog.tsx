"use client";

import { Button } from "./button";
import { Dialog } from "./dialog";

export interface ConfirmDialogTranslations {
  confirmButtonText: string;
  cancelButtonText: string;
  busyButtonText: string;
}

export interface ConfirmDialogCallbacks {
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  destructive?: boolean;
  busy?: boolean;
  translations?: Partial<ConfirmDialogTranslations>;
  callbacks: ConfirmDialogCallbacks;
}

const defaultTranslations: ConfirmDialogTranslations = {
  confirmButtonText: "Confirm",
  cancelButtonText: "Cancel",
  busyButtonText: "Working...",
};

/** Reusable destructive/confirm action dialog (delete user, delete role, ...). */
export function ConfirmDialog({
  open,
  title,
  description,
  destructive = false,
  busy = false,
  translations = {},
  callbacks,
}: ConfirmDialogProps) {
  const t = { ...defaultTranslations, ...translations };

  return (
    <Dialog
      open={open}
      onClose={callbacks.onCancel}
      title={title}
      busy={busy}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={callbacks.onCancel}
            disabled={busy}
          >
            {t.cancelButtonText}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            size="sm"
            onClick={callbacks.onConfirm}
            disabled={busy}
          >
            {busy ? t.busyButtonText : t.confirmButtonText}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{description}</p>
    </Dialog>
  );
}
