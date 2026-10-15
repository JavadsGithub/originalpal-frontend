"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/layout/auth-provider";

/** Logs out through `POST /api/auth/logout` (revokes the refresh token) and returns to /login. */
export default function SignOutButton() {
  const { logout } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isSigningOut}
      onClick={async () => {
        setIsSigningOut(true);
        try {
          await logout();
        } finally {
          setIsSigningOut(false);
          router.replace("/login");
        }
      }}
    >
      {isSigningOut ? "Signing out..." : "Sign out"}
    </Button>
  );
}
