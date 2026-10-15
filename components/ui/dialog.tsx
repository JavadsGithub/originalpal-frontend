"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Rendered in the action row (submit buttons etc.). */
  footer?: React.ReactNode;
  className?: string;
  /** Blocks the close button while a mutation is in flight. */
  busy?: boolean;
}

/**
 * Modal built on the native `<dialog>` element: real focus management, Escape handling and a
 * `::backdrop`, with no extra dependency. Used by the admin dialogs.
 */
function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  busy = false,
}: DialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;

    if (open && !element.open) {
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      data-slot="dialog"
      aria-label={title}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      // Clicking the backdrop (the dialog element itself, outside its content box) closes it.
      onClick={(event) => {
        if (busy) return;
        if (event.target === dialogRef.current) onClose();
      }}
      className={cn(
        "m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close dialog"
          onClick={onClose}
          disabled={busy}
        >
          ✕
        </Button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>

      {footer && (
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          {footer}
        </div>
      )}
    </dialog>
  );
}

export { Dialog };
