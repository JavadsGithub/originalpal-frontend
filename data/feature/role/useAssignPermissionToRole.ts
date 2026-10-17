import {
  useRolePermissionMutation,
  type RoleMutationOptions,
} from "./_rolePermissionMutation";
import type { Role } from "@/lib/types/auth";

/**
 * `POST /api/roles/{roleId}/permissions/{permissionId}` — requires `roles:assign_permission`.
 * Permission ids come from `@/lib/permissions` (`Permissions.*`).
 */
export function useAssignPermissionToRole(options?: RoleMutationOptions<Role>) {
  return useRolePermissionMutation("POST", options);
}

export default useAssignPermissionToRole;
