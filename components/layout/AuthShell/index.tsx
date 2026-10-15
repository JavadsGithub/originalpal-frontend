import type { ReactNode } from "react";

export interface AuthShellProps {
  children: ReactNode;
}

/**
 * Centred card shell for the public auth screens (sign in, register, password recovery).
 *
 * Purely presentational: it exists so every one of them ends up the same width and background
 * without each route repeating the utility classes.
 */
export default function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12 dark:bg-neutral-950 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
