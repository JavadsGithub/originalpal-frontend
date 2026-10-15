import Link from "next/link";
import AuthShell from "@/components/layout/AuthShell/index";
import ForgotPasswordForm from "@/components/feature/customer/ForgotPasswordForm/ForgotPasswordForm";

/** Public first half of the recovery flow (`POST /api/auth/recovery/request`). */
export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <div className="space-y-4">
        <ForgotPasswordForm />

        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
          Remembered it?{" "}
          <Link href="/login" className="font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
