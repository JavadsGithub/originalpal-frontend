import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface RoleRowData {
  id: string;
  name: string;
  isActive: boolean;
  permissionCount: number;
  /** Titles (`resource:action`) shown as chips. */
  permissionTitles: string[];
  isSuperUserRole: boolean;
}

export interface RolesTableTranslations {
  title: string;
  subtitle: string;
  createButtonText: string;
  nameHeader: string;
  permissionsHeader: string;
  statusHeader: string;
  actionsHeader: string;
  activeStatus: string;
  inactiveStatus: string;
  noRolesFound: string;
  editButtonText: string;
  activateButtonText: string;
  deactivateButtonText: string;
  permissionsButtonText: string;
  deleteButtonText: string;
  totalLabel: string;
  pageLabel: string;
  ofLabel: string;
  previousButtonText: string;
  nextButtonText: string;
  superUserBadge: string;
  morePermissionsLabel: string;
}

export interface RolesTableCallbacks {
  onCreate: () => void;
  onEdit: (roleId: string) => void;
  onToggleActive: (roleId: string, nextIsActive: boolean) => void;
  onManagePermissions: (roleId: string) => void;
  onDelete: (roleId: string) => void;
  onPageChange: (page: number) => void;
}

export interface RolesTableUIProps {
  roles: RoleRowData[];
  total: number;
  page: number;
  pages: number;
  busyRoleId?: string | null;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canAssignPermissions: boolean;
  translations?: Partial<RolesTableTranslations>;
  callbacks: RolesTableCallbacks;
}

const MAX_VISIBLE_PERMISSIONS = 3;

const defaultTranslations: RolesTableTranslations = {
  title: "Roles",
  subtitle: "Roles bundle permissions; users receive access through their roles.",
  createButtonText: "New role",
  nameHeader: "Name",
  permissionsHeader: "Permissions",
  statusHeader: "Status",
  actionsHeader: "Actions",
  activeStatus: "Active",
  inactiveStatus: "Inactive",
  noRolesFound: "No roles found.",
  editButtonText: "Edit",
  activateButtonText: "Activate",
  deactivateButtonText: "Deactivate",
  permissionsButtonText: "Permissions",
  deleteButtonText: "Delete",
  totalLabel: "total",
  pageLabel: "Page",
  ofLabel: "of",
  previousButtonText: "Previous",
  nextButtonText: "Next",
  superUserBadge: "super user",
  morePermissionsLabel: "more",
};

/** Tier 1 pure UI for the role list. */
export default function RolesTableUI({
  roles,
  total,
  page,
  pages,
  busyRoleId = null,
  canCreate,
  canUpdate,
  canDelete,
  canAssignPermissions,
  translations = {},
  callbacks,
}: RolesTableUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const hasActions = canUpdate || canDelete || canAssignPermissions;

  return (
    <section className="space-y-4" data-testid="roles-table">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground" data-testid="roles-total">
            {total} {t.totalLabel}
          </span>
          {canCreate && (
            <Button type="button" size="sm" onClick={callbacks.onCreate}>
              {t.createButtonText}
            </Button>
          )}
        </div>
      </header>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.nameHeader}</TableHead>
              <TableHead>{t.permissionsHeader}</TableHead>
              <TableHead>{t.statusHeader}</TableHead>
              {hasActions && <TableHead className="text-right">{t.actionsHeader}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={hasActions ? 4 : 3}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t.noRolesFound}
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => {
                const hidden = role.permissionTitles.length - MAX_VISIBLE_PERMISSIONS;
                const isBusy = busyRoleId === role.id;

                return (
                  <TableRow key={role.id} data-testid={`role-row-${role.name}`}>
                    <TableCell className="font-medium text-foreground">
                      <span className="flex items-center gap-2">
                        {role.name}
                        {role.isSuperUserRole && (
                          <Badge variant="success">{t.superUserBadge}</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      {role.permissionTitles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {role.permissionTitles
                            .slice(0, MAX_VISIBLE_PERMISSIONS)
                            .map((title) => (
                              <Badge key={title} variant="outline" className="font-mono">
                                {title}
                              </Badge>
                            ))}
                          {hidden > 0 && (
                            <Badge variant="default">
                              +{hidden} {t.morePermissionsLabel}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.isActive ? "success" : "warning"}>
                        {role.isActive ? t.activeStatus : t.inactiveStatus}
                      </Badge>
                    </TableCell>
                    {hasActions && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                disabled={isBusy}
                                onClick={() => callbacks.onEdit(role.id)}
                              >
                                {t.editButtonText}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                disabled={isBusy}
                                data-testid={`toggle-role-active-${role.name}`}
                                onClick={() => callbacks.onToggleActive(role.id, !role.isActive)}
                              >
                                {role.isActive ? t.deactivateButtonText : t.activateButtonText}
                              </Button>
                            </>
                          )}
                          {canAssignPermissions && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onManagePermissions(role.id)}
                            >
                              {t.permissionsButtonText}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onDelete(role.id)}
                            >
                              {t.deleteButtonText}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <nav
          className="flex items-center justify-end gap-3 text-xs text-muted-foreground"
          aria-label="Pagination"
        >
          <span>
            {t.pageLabel} {page} {t.ofLabel} {pages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={page <= 1}
            onClick={() => callbacks.onPageChange(page - 1)}
          >
            {t.previousButtonText}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={page >= pages}
            onClick={() => callbacks.onPageChange(page + 1)}
          >
            {t.nextButtonText}
          </Button>
        </nav>
      )}
    </section>
  );
}
