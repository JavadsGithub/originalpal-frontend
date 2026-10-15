"use client";

import { useMemo, useState } from "react";
import useAssignPermissionToRole from "@/data/feature/role/useAssignPermissionToRole";
import useUnassignPermissionFromRole from "@/data/feature/role/useUnassignPermissionFromRole";
import { useAuth } from "@/components/layout/auth-provider";
import {
  Permissions,
  permissionCatalog,
  type PermissionDescriptor,
} from "@/lib/permissions";
import type { ApiError } from "@/lib/api-error";
import type { Role } from "@/lib/types/auth";
import RolePermissionsDialogUI, { type PermissionGroup } from "./index";

export interface ManageRolePermissionsDialogProps {
  role: Role;
  onClose: () => void;
}

/**
 * Tier 2 injector: groups the generated permission catalogue by resource and maps each checkbox to
 * `POST`/`DELETE /api/roles/{roleId}/permissions/{permissionId}`.
 *
 * The catalogue comes from `@/lib/permissions` (generated from the backend registry) rather than
 * `GET /api/auth/permissions`, so the dialog works for anyone allowed to see the role screen, even
 * without `permissions:read`.
 */
export default function ManageRolePermissionsDialog({
  role,
  onClose,
}: ManageRolePermissionsDialogProps) {
  const { hasPermission, isSuperUser } = useAuth();
  const [selectedIds, setSelectedIds] = useState<string[]>(() => [...role.permission_ids]);
  const [busyPermissionId, setBusyPermissionId] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const assignPermission = useAssignPermissionToRole();
  const unassignPermission = useUnassignPermissionFromRole();

  const groups = useMemo<PermissionGroup[]>(() => {
    const byResource = new Map<string, PermissionGroup>();

    for (const entry of permissionCatalog as readonly PermissionDescriptor[]) {
      const resource = entry.title.split(":")[0] ?? "other";
      const group = byResource.get(resource) ?? { resource, options: [] };

      group.options.push({
        id: entry.id,
        title: entry.title,
        description: entry.description,
        isSuperUser: entry.title === "super:user",
      });

      byResource.set(resource, group);
    }

    return [...byResource.values()].sort((a, b) =>
      a.resource.localeCompare(b.resource),
    );
  }, []);

  const canAssign = isSuperUser || hasPermission(Permissions.Roles_AssignPermission);
  const canUnassign = isSuperUser || hasPermission(Permissions.Roles_UnassignPermission);

  const handleTogglePermission = (permissionId: string, nextChecked: boolean) => {
    setError(null);
    setBusyPermissionId(permissionId);

    const mutation = nextChecked ? assignPermission : unassignPermission;
    mutation.mutate(
      { roleId: role.id, permissionId },
      {
        onSuccess: () => {
          setSelectedIds((current) =>
            nextChecked
              ? [...new Set([...current, permissionId])]
              : current.filter((id) => id !== permissionId),
          );
        },
        onError: setError,
        onSettled: () => setBusyPermissionId(null),
      },
    );
  };

  return (
    <RolePermissionsDialogUI
      roleName={role.name}
      groups={groups}
      selectedPermissionIds={selectedIds}
      busyPermissionId={busyPermissionId}
      canAssign={canAssign}
      canUnassign={canUnassign}
      errorMessage={error?.message ?? null}
      callbacks={{ onTogglePermission: handleTogglePermission, onClose }}
    />
  );
}
