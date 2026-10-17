import Link from "next/link";
import AuthShell from "@/components/layout/AuthShell/index";
import { Suspense } from "react";
import RegisterForm from "@/components/feature/customer/RegisterForm/RegisterForm";

/**
 * Public registration (`POST /api/auth/register`). The account is active immediately, but the
 * endpoint issues no token, so the flow ends on the sign-in page.
 */
export default function RegisterPage() {
  return (
    <AuthShell>
      <div className="space-y-4">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
          <RegisterForm />
        </Suspense>

        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
          Already registered?{" "}
          <Link href="/login" className="font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
