"use client";

import { Permissions, type PermissionId } from "@/lib/permissions";
import { setAccessToken } from "@/lib/fetcher";
import type { Role, User } from "@/lib/types/auth";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import useGetCurrentUser from "@/data/feature/auth/useGetCurrentUser";
import useLogin, { type LoginCredentials } from "@/data/feature/auth/useLogin";
import useLogout from "@/data/feature/auth/useLogout";

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
  hasPermission: (permissionId: PermissionId | string) => boolean;
  hasAllPermissions: (permissionIds: (PermissionId | string)[]) => boolean;
  hasAnyPermission: (permissionIds: (PermissionId | string)[]) => boolean;
  isSuperUser: boolean;
  refreshUser: () => Promise<unknown>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authTokenPresent, setAuthTokenPresent] = useState<boolean>(true);
  const { user, isLoading: isUserLoading, refetch: refreshUser } = useGetCurrentUser(authTokenPresent);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  // Extract all permission IDs assigned to the user across all roles
  const userPermissionIds = useMemo(() => {
    if (!user || !user.roles) return new Set<string>();
    const permSet = new Set<string>();
    user.roles.forEach((role: Role) => {
      role.permission_ids?.forEach((id) => permSet.add(id));
    });
    return permSet;
  }, [user]);

  const isSuperUser = useMemo(() => {
    return userPermissionIds.has(Permissions.Super_User);
  }, [userPermissionIds]);

  const hasRole = useCallback(
    (roleName: string): boolean => {
      if (!user?.roles) return false;
      return user.roles.some(
        (role) => role.name.toLowerCase() === roleName.toLowerCase() && role.is_active,
      );
    },
    [user],
  );

  const hasPermission = useCallback(
    (permissionId: PermissionId | string): boolean => {
      if (!user) return false;
      if (isSuperUser) return true;
      return userPermissionIds.has(permissionId);
    },
    [user, isSuperUser, userPermissionIds],
  );

  const hasAllPermissions = useCallback(
    (permissionIds: (PermissionId | string)[]): boolean => {
      if (!user) return false;
      if (isSuperUser) return true;
      return permissionIds.every((id) => userPermissionIds.has(id));
    },
    [user, isSuperUser, userPermissionIds],
  );

  const hasAnyPermission = useCallback(
    (permissionIds: (PermissionId | string)[]): boolean => {
      if (!user) return false;
      if (isSuperUser) return true;
      return permissionIds.some((id) => userPermissionIds.has(id));
    },
    [user, isSuperUser, userPermissionIds],
  );

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const result = await loginMutation.mutateAsync(credentials);
      if (result.token) {
        setAuthTokenPresent(true);
        await refreshUser();
      }
    },
    [loginMutation, refreshUser],
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    setAccessToken(null);
    setAuthTokenPresent(false);
  }, [logoutMutation]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading: isUserLoading,
      login,
      logout,
      hasRole,
      hasPermission,
      hasAllPermissions,
      hasAnyPermission,
      isSuperUser,
      refreshUser,
    }),
    [
      user,
      isUserLoading,
      login,
      logout,
      hasRole,
      hasPermission,
      hasAllPermissions,
      hasAnyPermission,
      isSuperUser,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
