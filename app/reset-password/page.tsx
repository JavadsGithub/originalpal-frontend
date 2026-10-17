import AuthShell from "@/components/layout/AuthShell/index";
import { Suspense } from "react";
import ResetPasswordForm from "@/components/feature/customer/ResetPasswordForm/ResetPasswordForm";

/**
 * Public second half of the recovery flow (`POST /api/auth/recovery/reset`).
 *
 * The token arrives in the query string — `useSearchParams` needs a Suspense boundary, exactly like
 * the sign-in page.
 */
export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <div className="space-y-4">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </AuthShell>
  );
}
