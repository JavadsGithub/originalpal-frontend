"use client";

import { useState } from "react";
import useGetRoles from "@/data/feature/role/useGetRoles";
import useUpdateRole from "@/data/feature/role/useUpdateRole";
import useDeleteRole from "@/data/feature/role/useDeleteRole";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions, permissionTitleById } from "@/lib/permissions";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/api";
import type { ApiError } from "@/lib/api-error";
import type { Role } from "@/lib/types/auth";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/form-error";
import CreateRoleDialog from "@/components/feature/role/RoleFormDialog/CreateRoleDialog";
import EditRoleDialog from "@/components/feature/role/RoleFormDialog/EditRoleDialog";
import ManageRolePermissionsDialog from "@/components/feature/role/RolePermissionsDialog/ManageRolePermissionsDialog";
import RolesTableLoading from "./loading";
import RolesTableError from "./error";
import RolesTableUI, { type RoleRowData } from "./index";

export interface AdminRolesTableProps {
  pageSize?: number;
}

/**
 * Tier 2 dependency injector for role management.
 *
 * Endpoints and permissions: `GET /roles/` (roles:read), `POST /roles/` (roles:create),
 * `PUT /roles/{id}` (roles:update), `DELETE /roles/{id}` (roles:delete), permission assignment via
 * `POST|DELETE /roles/{id}/permissions/{permissionId}`.
 */
export default function AdminRolesTable({ pageSize = DEFAULT_PAGE_SIZE }: AdminRolesTableProps) {
  const { hasPermission, isSuperUser } = useAuth();

  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<
    | { kind: "none" }
    | { kind: "create" }
    | { kind: "edit"; role: Role }
    | { kind: "permissions"; role: Role }
    | { kind: "delete"; role: Role }
  >({ kind: "none" });
  const [busyRoleId, setBusyRoleId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  const { roles, total, page: currentPage, pages, isLoading, isError, error, refetch } =
    useGetRoles({ page, size: pageSize });

  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const canCreate = isSuperUser || hasPermission(Permissions.Roles_Create);
  const canUpdate = isSuperUser || hasPermission(Permissions.Roles_Update);
  const canDelete = isSuperUser || hasPermission(Permissions.Roles_Delete);
  const canAssignPermissions =
    isSuperUser || hasPermission(Permissions.Roles_AssignPermission);

  const rows: RoleRowData[] = roles.map((role) => ({
    id: role.id,
    name: role.name,
    isActive: role.is_active,
    permissionCount: role.permission_ids.length,
    permissionTitles: role.permission_ids
      .map((id) => permissionTitleById(id))
      .filter((title) => title !== null),
    isSuperUserRole: role.permission_ids.includes(Permissions.Super_User),
  }));

  const handleToggleActive = (roleId: string, nextIsActive: boolean) => {
    setActionError(null);
    setBusyRoleId(roleId);

    updateRole.mutate(
      { id: roleId, data: { is_active: nextIsActive } },
      { onError: setActionError, onSettled: () => setBusyRoleId(null) },
    );
  };

  const handleDelete = (role: Role) => {
    setActionError(null);
    setBusyRoleId(role.id);

    deleteRole.mutate(role.id, {
      onSuccess: () => setDialog({ kind: "none" }),
      onError: setActionError,
      onSettled: () => setBusyRoleId(null),
    });
  };

  const findRoleById = (roleId: string): Role | undefined =>
    roles.find((role) => role.id === roleId);

  if (isLoading) return <RolesTableLoading />;

  if (isError) {
    return (
      <RolesTableError
        message={error?.message ?? "Failed to load roles"}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {actionError && (
          <FormError message={actionError.message} data-testid="roles-action-error" />
        )}

        <RolesTableUI
          roles={rows}
          total={total}
          page={currentPage}
          pages={pages}
          busyRoleId={busyRoleId}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canAssignPermissions={canAssignPermissions}
          callbacks={{
            onCreate: () => setDialog({ kind: "create" }),
            onEdit: (roleId) => {
              const role = findRoleById(roleId);
              if (role) setDialog({ kind: "edit", role });
            },
            onToggleActive: handleToggleActive,
            onManagePermissions: (roleId) => {
              const role = findRoleById(roleId);
              if (role) setDialog({ kind: "permissions", role });
            },
            onDelete: (roleId) => {
              const role = findRoleById(roleId);
              if (role) setDialog({ kind: "delete", role });
            },
            onPageChange: setPage,
          }}
        />
      </div>

      {dialog.kind === "create" && (
        <CreateRoleDialog onClose={() => setDialog({ kind: "none" })} />
      )}

      {dialog.kind === "edit" && (
        <EditRoleDialog role={dialog.role} onClose={() => setDialog({ kind: "none" })} />
      )}

      {dialog.kind === "permissions" && (
        <ManageRolePermissionsDialog
          role={dialog.role}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}

      {dialog.kind === "delete" && (
        <ConfirmDialog
          open
          destructive
          busy={busyRoleId === dialog.role.id}
          title={`Delete ${dialog.role.name}?`}
          description="Users holding this role lose the permissions it granted."
          translations={{ confirmButtonText: "Delete role" }}
          callbacks={{
            onConfirm: () => handleDelete(dialog.role),
            onCancel: () => setDialog({ kind: "none" }),
          }}
        />
      )}
    </>
  );
}
