"use client";

import useGetUsers from "@/data/feature/user/useGetUsers";
import UsersTableUI, { type UserRowData } from "./index";

export default function UsersTable() {
  const { users, isLoading, isError, error } = useGetUsers();

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-neutral-500">
        Loading users...
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Failed to load users";
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-400">
        {message}
      </div>
    );
  }

  const formattedUsers: UserRowData[] = users.map((u) => ({
    id: u.id,
    username: u.username,
    fullName: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username,
    email: u.email,
    roles: u.roles || [],
    isActive: u.is_active,
    createdAt: u.created_at,
  }));

  return <UsersTableUI users={formattedUsers} />;
}
