"use client";

import { useAuth } from "@/components/layout/auth-provider";
import { Badge } from "@/components/ui/badge";

/** Shows who is signed in and whether the super-user bypass is active. */
export default function IdentityBadge() {
  const { user, isSuperUser, isLoading } = useAuth();

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">…</span>;
  }

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-foreground">{user.username}</span>
      {isSuperUser ? (
        <Badge variant="success">super:user</Badge>
      ) : (
        user.roles
          .filter((role) => role.is_active)
          .map((role) => (
            <Badge key={role.id} variant="outline">
              {role.name}
            </Badge>
          ))
      )}
    </div>
  );
}
