"use client";

import { useState } from "react";
import useGetRoles from "@/data/feature/role/useGetRoles";
import useAssignUserRole from "@/data/feature/user/useAssignUserRole";
import useRemoveUserRole from "@/data/feature/user/useRemoveUserRole";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import type { ApiError } from "@/lib/api-error";
import type { User } from "@/lib/types/auth";
import UserRolesDialogUI, { type AssignableRole } from "./index";

export interface ManageUserRolesDialogProps {
  user: User;
  onClose: () => void;
}

/**
 * Tier 2 dependency injector: role catalogue + assign/unassign mutations for one user.
 *
 * Each toggle is a separate backend call, so the dialog tracks the row currently in flight and
 * shows the failure inline instead of closing on error. `users:assign_role` /
 * `users:unassign_role` gate the checkboxes individually.
 */
export default function ManageUserRolesDialog({
  user,
  onClose,
}: ManageUserRolesDialogProps) {
  const { hasPermission, isSuperUser } = useAuth();
  const [busyRoleId, setBusyRoleId] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [assignedIds, setAssignedIds] = useState<string[]>(() =>
    user.roles.map((role) => role.id),
  );

  const { roles, isLoading } = useGetRoles({ page: 1, size: 100 });
  const assignRole = useAssignUserRole();
  const removeRole = useRemoveUserRole();

  const assignable: AssignableRole[] = roles.map((role) => ({
    id: role.id,
    name: role.name,
    isActive: role.is_active,
    permissionCount: role.permission_ids.length,
  }));

  const canAssign =
    isSuperUser || hasPermission(Permissions.Users_AssignRole);
  const canUnassign =
    isSuperUser || hasPermission(Permissions.Users_UnassignRole);

  const handleToggleRole = (roleId: string, nextChecked: boolean) => {
    setError(null);
    setBusyRoleId(roleId);

    const mutation = nextChecked ? assignRole : removeRole;
    mutation.mutate(
      { userId: user.id, roleId },
      {
        onSuccess: () => {
          setAssignedIds((current) =>
            nextChecked
              ? [...new Set([...current, roleId])]
              : current.filter((id) => id !== roleId),
          );
        },
        onError: setError,
        onSettled: () => setBusyRoleId(null),
      },
    );
  };

  return (
    <UserRolesDialogUI
      username={user.username}
      roles={isLoading ? [] : assignable}
      assignedRoleIds={assignedIds}
      busyRoleId={busyRoleId}
      canAssign={canAssign}
      canUnassign={canUnassign}
      errorMessage={error?.message ?? null}
      callbacks={{ onToggleRole: handleToggleRole, onClose }}
    />
  );
}
