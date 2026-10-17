import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormErrorProps extends React.ComponentProps<"p"> {
  /** Rendered only when a message exists. */
  message?: string | null;
}

/** Inline error text for forms and dialogs. */
export function FormError({ message, className, ...props }: FormErrorProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      data-slot="form-error"
      className={cn(
        "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300",
        className,
      )}
      {...props}
    >
      {message}
    </p>
  );
}
