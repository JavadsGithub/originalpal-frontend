"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";

export interface PermissionOption {
  id: string;
  title: string;
  description: string;
  isSuperUser: boolean;
}

export interface PermissionGroup {
  /** Resource prefix, e.g. `users`, `orders`, `homepage`. */
  resource: string;
  options: PermissionOption[];
}

export interface RolePermissionsDialogTranslations {
  title: string;
  description: string;
  selectedLabel: string;
  close: string;
  superUserHint: string;
  resourceLabel: string;
}

export interface RolePermissionsDialogCallbacks {
  onTogglePermission: (permissionId: string, nextChecked: boolean) => void;
  onClose: () => void;
}

export interface RolePermissionsDialogUIProps {
  roleName: string;
  groups: PermissionGroup[];
  selectedPermissionIds: string[];
  busyPermissionId?: string | null;
  canAssign: boolean;
  canUnassign: boolean;
  errorMessage?: string | null;
  translations?: Partial<RolePermissionsDialogTranslations>;
  callbacks: RolePermissionsDialogCallbacks;
}

const defaultTranslations: RolePermissionsDialogTranslations = {
  title: "Permissions",
  description:
    "Each checkbox is one API call to assign or unassign a permission id on this role.",
  selectedLabel: "selected",
  close: "Close",
  superUserHint: "grants everything — the backend skips all other checks",
  resourceLabel: "Resource",
};

/**
 * Tier 1 pure UI for the permission matrix of a role.
 *
 * The permission catalogue is passed in as a grouped, primitive-shaped structure (built by the
 * injector from `@/lib/permissions`), so this component has no knowledge of ids or the API.
 */
export default function RolePermissionsDialogUI({
  roleName,
  groups,
  selectedPermissionIds,
  busyPermissionId = null,
  canAssign,
  canUnassign,
  errorMessage = null,
  translations = {},
  callbacks,
}: RolePermissionsDialogUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const selected = new Set(selectedPermissionIds);

  return (
    <Dialog
      open
      onClose={callbacks.onClose}
      title={`${t.title} — ${roleName}`}
      description={t.description}
      busy={Boolean(busyPermissionId)}
      className="w-[min(46rem,calc(100vw-2rem))]"
      footer={
        <Button type="button" variant="outline" size="sm" onClick={callbacks.onClose}>
          {t.close}
        </Button>
      }
    >
      <div className="space-y-4" data-testid="role-permissions-dialog">
        <FormError message={errorMessage} />

        <p className="text-xs text-muted-foreground">
          {selected.size} {t.selectedLabel}
        </p>

        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.resource} className="space-y-2">
              <h3 className="font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.resource}
              </h3>

              <ul className="grid gap-2 sm:grid-cols-2">
                {group.options.map((option) => {
                  const isSelected = selected.has(option.id);
                  const disabled =
                    busyPermissionId !== null ||
                    (isSelected ? !canUnassign : !canAssign);

                  return (
                    <li key={option.id} className="rounded-md border border-border px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-foreground">
                              {option.title}
                            </span>
                            {option.isSuperUser && <Badge variant="success">super</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {option.isSuperUser ? t.superUserHint : option.description}
                          </p>
                        </div>

                        <Checkbox
                          aria-label={option.title}
                          checked={isSelected}
                          disabled={disabled}
                          onChange={(event) =>
                            callbacks.onTogglePermission(option.id, event.target.checked)
                          }
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
