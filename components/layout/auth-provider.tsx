"use client";

import { Permissions, type PermissionId } from "@/lib/permissions";
import { setAccessToken, subscribeToSession } from "@/lib/fetcher";
import type { Role, User } from "@/lib/types/auth";
import { authKeys } from "@/data/query-keys";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();

  /**
   * Whether the identity query should run at all.
   *
   * Starts `true` on purpose: the access token only lives in memory, so a fresh page load has no
   * token but may still own a valid HttpOnly refresh cookie. The fetcher answers the resulting 401
   * with one silent `POST /api/auth/refresh` and replays `GET /api/auth/me`, which restores the
   * session without user interaction. After an explicit logout there is nothing to restore, so the
   * query is disabled again.
   */
  const [shouldFetchIdentity, setShouldFetchIdentity] = useState(true);

  const {
    user,
    isLoading: isUserLoading,
    refetch: refreshUser,
  } = useGetCurrentUser(shouldFetchIdentity);

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  // A refresh that fails means the refresh cookie is gone: drop the cached identity so guards
  // redirect to /login instead of rendering a stale user.
  useEffect(
    () =>
      subscribeToSession((event) => {
        if (event.type === "session-expired" || event.type === "logged-out") {
          queryClient.setQueryData(authKeys.me(), null);
          void queryClient.cancelQueries({ queryKey: authKeys.all });
        }

        if (event.type === "logged-out") {
          setShouldFetchIdentity(false);
        }
      }),
    [queryClient],
  );

  const userPermissionIds = useMemo(() => {
    const permissionIds = new Set<string>();
    if (!user?.roles) return permissionIds;

    user.roles.forEach((role: Role) => {
      if (role.is_active === false) return;
      role.permission_ids?.forEach((id) => permissionIds.add(id));
    });

    return permissionIds;
  }, [user]);

  const isSuperUser = useMemo(
    () => userPermissionIds.has(Permissions.Super_User),
    [userPermissionIds],
  );

  const hasRole = useCallback(
    (roleName: string): boolean => {
      if (!user?.roles) return false;
      return user.roles.some(
        (role) =>
          role.name.toLowerCase() === roleName.toLowerCase() &&
          role.is_active !== false,
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
      if (result?.token) {
        setAccessToken(result.token);
        setShouldFetchIdentity(true);
        await refreshUser();
      }
    },
    [loginMutation, refreshUser],
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      setAccessToken(null);
      setShouldFetchIdentity(false);
    }
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
