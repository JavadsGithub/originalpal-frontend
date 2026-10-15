/**
 * Central React Query key registry.
 *
 * One place to look when invalidating after a mutation, so hooks never guess each other's keys.
 */
export const authKeys = {
  all: ["auth"] as const,
  me: () => [...authKeys.all, "me"] as const,
  permissions: () => [...authKeys.all, "permissions"] as const,
};

export const userKeys = {
  all: ["users"] as const,
  list: (params: { page: number; size: number }) =>
    [...userKeys.all, "list", params] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
};

export const roleKeys = {
  all: ["roles"] as const,
  list: (params: { page: number; size: number }) =>
    [...roleKeys.all, "list", params] as const,
  detail: (id: string) => [...roleKeys.all, "detail", id] as const,
};

export const systemKeys = {
  all: ["system"] as const,
  backendHealth: () => [...systemKeys.all, "backend-health"] as const,
};
