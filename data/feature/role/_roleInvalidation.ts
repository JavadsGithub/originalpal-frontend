import type { QueryClient } from "@tanstack/react-query";
import { authKeys, roleKeys } from "@/data/query-keys";

/**
 * Every role write changes what the permission system allows, so role caches *and* the identity
 * query (which carries the caller's own roles) must be invalidated together.
 */
export function invalidateRoleCaches(
  queryClient: QueryClient,
  roleId?: string,
): void {
  queryClient.invalidateQueries({ queryKey: roleKeys.all });
  if (roleId) {
    queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
  }
  queryClient.invalidateQueries({ queryKey: authKeys.me() });
}
