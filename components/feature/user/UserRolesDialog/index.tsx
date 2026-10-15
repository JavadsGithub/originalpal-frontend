"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";

export interface AssignableRole {
  id: string;
  name: string;
  isActive: boolean;
  permissionCount: number;
}

export interface UserRolesDialogTranslations {
  title: string;
  description: string;
  empty: string;
  inactiveRoleHint: string;
  close: string;
  permissionCountLabel: string;
}

export interface UserRolesDialogCallbacks {
  onToggleRole: (roleId: string, nextChecked: boolean) => void;
  onClose: () => void;
}

export interface UserRolesDialogUIProps {
  username: string;
  roles: AssignableRole[];
  assignedRoleIds: string[];
  busyRoleId?: string | null;
  canAssign: boolean;
  canUnassign: boolean;
  errorMessage?: string | null;
  translations?: Partial<UserRolesDialogTranslations>;
  callbacks: UserRolesDialogCallbacks;
}

const defaultTranslations: UserRolesDialogTranslations = {
  title: "Roles",
  description: "Changes take effect on the user's next request.",
  empty: "No roles exist yet — create one under Roles first.",
  inactiveRoleHint: "inactive",
  close: "Close",
  permissionCountLabel: "permissions",
};

/**
 * Tier 1 pure UI for assigning/removing roles on one user.
 * Every assignment maps to `POST`/`DELETE /api/users/{id}/roles/{roleId}`.
 */
export default function UserRolesDialogUI({
  username,
  roles,
  assignedRoleIds,
  busyRoleId = null,
  canAssign,
  canUnassign,
  errorMessage = null,
  translations = {},
  callbacks,
}: UserRolesDialogUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const assigned = new Set(assignedRoleIds);

  return (
    <Dialog
      open
      onClose={callbacks.onClose}
      title={`${t.title} — ${username}`}
      description={t.description}
      busy={Boolean(busyRoleId)}
      footer={
        <Button type="button" variant="outline" size="sm" onClick={callbacks.onClose}>
          {t.close}
        </Button>
      }
    >
      <div className="space-y-3" data-testid="user-roles-dialog">
        <FormError message={errorMessage} />

        {roles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <ul className="space-y-2">
            {roles.map((role) => {
              const isAssigned = assigned.has(role.id);
              const disabled =
                busyRoleId !== null ||
                (isAssigned ? !canUnassign : !canAssign);

              return (
                <li
                  key={role.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{role.name}</span>
                      {!role.isActive && <Badge variant="outline">{t.inactiveRoleHint}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {role.permissionCount} {t.permissionCountLabel}
                    </p>
                  </div>

                  <Checkbox
                    aria-label={`${role.name} role`}
                    checked={isAssigned}
                    disabled={disabled}
                    onChange={(event) =>
                      callbacks.onToggleRole(role.id, event.target.checked)
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
