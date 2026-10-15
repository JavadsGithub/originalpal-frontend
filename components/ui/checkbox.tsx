import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.ComponentProps<"input">, "type"> {
  label?: React.ReactNode;
}

/**
 * Native checkbox with an accessible label. Kept dependency-free so it works in tests and forms
 * without a provider tree.
 */
function Checkbox({ className, label, id, ...props }: CheckboxProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;

  const input = (
    <input
      id={inputId}
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "size-4 shrink-0 rounded border-border text-primary accent-primary",
        "focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );

  if (!label) return input;

  return (
    <label
      htmlFor={inputId}
      className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
    >
      {input}
      <span>{label}</span>
    </label>
  );
}

export { Checkbox };
