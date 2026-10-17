"use client";

import { useState } from "react";
import useGetUsers from "@/data/feature/user/useGetUsers";
import useUpdateUser from "@/data/feature/user/useUpdateUser";
import useDeleteUser from "@/data/feature/user/useDeleteUser";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/api";
import type { ApiError } from "@/lib/api-error";
import type { User } from "@/lib/types/auth";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/form-error";
import CreateUserDialog from "@/components/feature/user/UserFormDialog/CreateUserDialog";
import EditUserDialog from "@/components/feature/user/UserFormDialog/EditUserDialog";
import ManageUserRolesDialog from "@/components/feature/user/UserRolesDialog/ManageUserRolesDialog";
import UsersTableUI, { type UserRowData } from "./index";
import UsersTableLoading from "./loading";
import UsersTableError from "./error";

export interface AdminUsersTableProps {
  pageSize?: number;
}

/**
 * Tier 2 dependency injector for the user-management screen.
 *
 * Wires the user list, the activation toggle, the create/edit dialogs, role assignment and deletion,
 * and derives every action gate from the caller's permissions (`users:*`, with the super-user
 * bypass handled by `useAuth`).
 *
 * Endpoints and their permissions: `GET /users/` (users:read), `POST /users/` (users:create),
 * `PUT /users/{id}` (users:update), `DELETE /users/{id}` (users:delete),
 * `POST|DELETE /users/{id}/roles/{roleId}` (users:assign_role / users:unassign_role).
 */
export default function AdminUsersTable({ pageSize = DEFAULT_PAGE_SIZE }: AdminUsersTableProps) {
  const { hasPermission, isSuperUser, user: currentUser } = useAuth();

  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<
    | { kind: "none" }
    | { kind: "create" }
    | { kind: "edit"; user: User }
    | { kind: "roles"; user: User }
    | { kind: "delete"; user: User }
  >({ kind: "none" });
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  const { users, total, page: currentPage, pages, isLoading, isError, error, refetch } =
    useGetUsers({ page, size: pageSize });

  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const canCreate = isSuperUser || hasPermission(Permissions.Users_Create);
  const canUpdate = isSuperUser || hasPermission(Permissions.Users_Update);
  const canDelete = isSuperUser || hasPermission(Permissions.Users_Delete);
  const canAssignRoles = isSuperUser || hasPermission(Permissions.Users_AssignRole);

  const rows: UserRowData[] = users.map((user) => ({
    id: user.id,
    username: user.username,
    fullName: `${user.first_name} ${user.last_name}`.trim() || user.username,
    email: user.email,
    roles: user.roles.map((role) => ({
      id: role.id,
      name: role.name,
      isActive: role.is_active,
    })),
    isActive: user.is_active,
    createdAt: user.created_at,
  }));

  const handleToggleActive = (userId: string, nextIsActive: boolean) => {
    setActionError(null);
    setBusyUserId(userId);

    updateUser.mutate(
      { id: userId, data: { is_active: nextIsActive } },
      {
        onError: setActionError,
        onSettled: () => setBusyUserId(null),
      },
    );
  };

  const handleDelete = (user: User) => {
    setActionError(null);
    setBusyUserId(user.id);

    deleteUser.mutate(user.id, {
      onSuccess: () => setDialog({ kind: "none" }),
      onError: setActionError,
      onSettled: () => setBusyUserId(null),
    });
  };

  const findUserById = (userId: string): User | undefined =>
    users.find((user) => user.id === userId);

  if (isLoading) return <UsersTableLoading />;

  if (isError) {
    return (
      <UsersTableError
        message={error?.message ?? "Failed to load users"}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {actionError && (
          <FormError message={actionError.message} data-testid="users-action-error" />
        )}

        <UsersTableUI
          users={rows}
          total={total}
          page={currentPage}
          pages={pages}
          busyUserId={busyUserId}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canAssignRoles={canAssignRoles}
          callbacks={{
            onCreate: () => setDialog({ kind: "create" }),
            onEdit: (userId) => {
              const user = findUserById(userId);
              if (user) setDialog({ kind: "edit", user });
            },
            onToggleActive: handleToggleActive,
            onManageRoles: (userId) => {
              const user = findUserById(userId);
              if (user) setDialog({ kind: "roles", user });
            },
            onDelete: (userId) => {
              const user = findUserById(userId);
              if (user) setDialog({ kind: "delete", user });
            },
            onPageChange: setPage,
          }}
        />
      </div>

      {dialog.kind === "create" && (
        <CreateUserDialog onClose={() => setDialog({ kind: "none" })} />
      )}

      {dialog.kind === "edit" && (
        <EditUserDialog user={dialog.user} onClose={() => setDialog({ kind: "none" })} />
      )}

      {dialog.kind === "roles" && (
        <ManageUserRolesDialog user={dialog.user} onClose={() => setDialog({ kind: "none" })} />
      )}

      {dialog.kind === "delete" && (
        <ConfirmDialog
          open
          destructive
          busy={busyUserId === dialog.user.id}
          title={`Delete ${dialog.user.username}?`}
          description={`This permanently removes ${dialog.user.email} and their role assignments.`}
          translations={{ confirmButtonText: "Delete user" }}
          callbacks={{
            onConfirm: () => handleDelete(dialog.user),
            onCancel: () => setDialog({ kind: "none" }),
          }}
        />
      )}

      {currentUser && dialog.kind === "delete" && dialog.user.id === currentUser.id && (
        <FormError message="Deleting your own account will end this session." />
      )}
    </>
  );
}
