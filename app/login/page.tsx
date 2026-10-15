import LoginForm from "@/components/feature/auth/LoginForm/LoginForm";
import AuthShell from "@/components/layout/AuthShell/index";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div>Loading login form...</div>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
