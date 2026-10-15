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

export interface UserRoleChip {
  id: string;
  name: string;
  isActive: boolean;
}

export interface UserRowData {
  id: string;
  username: string;
  fullName: string;
  email: string;
  roles: UserRoleChip[];
  isActive: boolean;
  createdAt: string;
}

export interface UsersTableTranslations {
  title: string;
  subtitle: string;
  createButtonText: string;
  usernameHeader: string;
  fullNameHeader: string;
  emailHeader: string;
  rolesHeader: string;
  statusHeader: string;
  actionsHeader: string;
  activeStatus: string;
  inactiveStatus: string;
  noUsersFound: string;
  editButtonText: string;
  activateButtonText: string;
  deactivateButtonText: string;
  rolesButtonText: string;
  deleteButtonText: string;
  totalLabel: string;
  pageLabel: string;
  ofLabel: string;
  previousButtonText: string;
  nextButtonText: string;
}

export interface UsersTableCallbacks {
  onCreate: () => void;
  onEdit: (userId: string) => void;
  onToggleActive: (userId: string, nextIsActive: boolean) => void;
  onManageRoles: (userId: string) => void;
  onDelete: (userId: string) => void;
  onPageChange: (page: number) => void;
}

export interface UsersTableUIProps {
  users: UserRowData[];
  total: number;
  page: number;
  pages: number;
  busyUserId?: string | null;
  /** Action gates — computed from the caller's permissions by the injector. */
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canAssignRoles: boolean;
  translations?: Partial<UsersTableTranslations>;
  callbacks: UsersTableCallbacks;
}

const defaultTranslations: UsersTableTranslations = {
  title: "Users",
  subtitle: "Accounts, activation state and role assignments.",
  createButtonText: "New user",
  usernameHeader: "Username",
  fullNameHeader: "Full name",
  emailHeader: "Email",
  rolesHeader: "Roles",
  statusHeader: "Status",
  actionsHeader: "Actions",
  activeStatus: "Active",
  inactiveStatus: "Inactive",
  noUsersFound: "No users found.",
  editButtonText: "Edit",
  activateButtonText: "Activate",
  deactivateButtonText: "Deactivate",
  rolesButtonText: "Roles",
  deleteButtonText: "Delete",
  totalLabel: "total",
  pageLabel: "Page",
  ofLabel: "of",
  previousButtonText: "Previous",
  nextButtonText: "Next",
};

/**
 * Tier 1 pure UI: primitives and callbacks only. Every permission-sensitive control is driven by
 * a boolean prop, so the UI stays free of auth logic and is testable in isolation.
 */
export default function UsersTableUI({
  users,
  total,
  page,
  pages,
  busyUserId = null,
  canCreate,
  canUpdate,
  canDelete,
  canAssignRoles,
  translations = {},
  callbacks,
}: UsersTableUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const hasActions = canUpdate || canDelete || canAssignRoles;

  return (
    <section className="space-y-4" data-testid="users-table">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground" data-testid="users-total">
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
              <TableHead>{t.usernameHeader}</TableHead>
              <TableHead>{t.fullNameHeader}</TableHead>
              <TableHead>{t.emailHeader}</TableHead>
              <TableHead>{t.rolesHeader}</TableHead>
              <TableHead>{t.statusHeader}</TableHead>
              {hasActions && <TableHead className="text-right">{t.actionsHeader}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={hasActions ? 6 : 5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t.noUsersFound}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isBusy = busyUserId === user.id;

                return (
                  <TableRow key={user.id} data-testid={`user-row-${user.username}`}>
                    <TableCell className="font-medium text-foreground">{user.username}</TableCell>
                    <TableCell>{user.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          user.roles.map((role) => (
                            <Badge
                              key={role.id}
                              variant={role.isActive ? "default" : "outline"}
                              title={role.isActive ? undefined : "Inactive role"}
                            >
                              {role.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "success" : "warning"}>
                        {user.isActive ? t.activeStatus : t.inactiveStatus}
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
                                onClick={() => callbacks.onEdit(user.id)}
                              >
                                {t.editButtonText}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                disabled={isBusy}
                                data-testid={`toggle-active-${user.username}`}
                                onClick={() => callbacks.onToggleActive(user.id, !user.isActive)}
                              >
                                {user.isActive ? t.deactivateButtonText : t.activateButtonText}
                              </Button>
                            </>
                          )}
                          {canAssignRoles && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onManageRoles(user.id)}
                            >
                              {t.rolesButtonText}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onDelete(user.id)}
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
