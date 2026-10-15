import * as React from "react";
import { cn } from "@/lib/utils";

/** Native select styled with the project's tokens (keeps forms dependency-free and testable). */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="select"
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-background px-2.5 py-1 text-sm shadow-xs transition-colors",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { Select };
