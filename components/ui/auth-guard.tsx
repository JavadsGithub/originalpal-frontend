"use client";

import { useAuth } from "@/components/layout/auth-provider";
import type { PermissionId } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

export interface PermissionGateProps {
  permission?: PermissionId | string;
  permissions?: (PermissionId | string)[];
  requireAll?: boolean;
  role?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Level 3 Component Primitive:
 * Conditionally renders children if the authenticated user has the required permission(s) or role.
 */
export function PermissionGate({
  permission,
  permissions,
  requireAll = true,
  role,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission, hasRole, isSuperUser } =
    useAuth();

  if (isSuperUser) {
    return <>{children}</>;
  }

  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (permissions && permissions.length > 0) {
    const hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

export interface AuthGuardProps {
  children: ReactNode;
  permission?: PermissionId | string;
  role?: string;
  redirectTo?: string;
  fallback?: ReactNode;
}

/**
 * Level 2 Route / Layout Guard:
 * Wraps routes or layout sections, redirecting unauthenticated or unauthorized users.
 */
export function AuthGuard({
  children,
  permission,
  role,
  redirectTo = "/login",
  fallback = (
    <div className="flex h-64 items-center justify-center text-sm text-neutral-500">
      Checking authorization...
    </div>
  ),
}: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, hasPermission, hasRole, isSuperUser } =
    useAuth();

  const isAuthorized =
    isAuthenticated &&
    (isSuperUser ||
      ((!permission || hasPermission(permission)) && (!role || hasRole(role))));

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isLoading, isAuthenticated, redirectTo, router]);

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
        <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
          Access Denied
        </h2>
        <p className="text-sm text-neutral-500">
          You do not have the required permissions to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
