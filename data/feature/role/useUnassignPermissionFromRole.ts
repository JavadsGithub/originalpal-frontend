import {
  useRolePermissionMutation,
  type RoleMutationOptions,
} from "./_rolePermissionMutation";
import type { Role } from "@/lib/types/auth";

/**
 * `DELETE /api/roles/{roleId}/permissions/{permissionId}` — requires
 * `roles:unassign_permission`.
 */
export function useUnassignPermissionFromRole(options?: RoleMutationOptions<Role>) {
  return useRolePermissionMutation("DELETE", options);
}

export default useUnassignPermissionFromRole;
