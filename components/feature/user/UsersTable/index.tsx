import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Role } from "@/lib/types/auth";

export interface UserRowData {
  id: string;
  username: string;
  fullName: string;
  email: string;
  roles: Role[];
  isActive: boolean;
  createdAt: string;
}

export interface UsersTableTranslations {
  title: string;
  usernameHeader: string;
  fullNameHeader: string;
  emailHeader: string;
  rolesHeader: string;
  statusHeader: string;
  activeStatus: string;
  inactiveStatus: string;
  noUsersFound: string;
}

export interface UsersTableUIProps {
  users: UserRowData[];
  translations?: Partial<UsersTableTranslations>;
}

const defaultTranslations: UsersTableTranslations = {
  title: "Users Management",
  usernameHeader: "Username",
  fullNameHeader: "Full Name",
  emailHeader: "Email",
  rolesHeader: "Roles",
  statusHeader: "Status",
  activeStatus: "Active",
  inactiveStatus: "Inactive",
  noUsersFound: "No users found.",
};

export default function UsersTableUI({
  users,
  translations = {},
}: UsersTableUIProps) {
  const t = { ...defaultTranslations, ...translations };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {t.title}
      </h2>
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.usernameHeader}</TableHead>
              <TableHead>{t.fullNameHeader}</TableHead>
              <TableHead>{t.emailHeader}</TableHead>
              <TableHead>{t.rolesHeader}</TableHead>
              <TableHead className="text-right">{t.statusHeader}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-neutral-500"
                >
                  {t.noUsersFound}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                    {user.username}
                  </TableCell>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell className="text-neutral-500 dark:text-neutral-400">
                    {user.email}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((r) => (
                        <span
                          key={r.id || r.name}
                          className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                        >
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                      }`}
                    >
                      {user.isActive ? t.activeStatus : t.inactiveStatus}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
