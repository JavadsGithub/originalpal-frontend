import {
  useUserRoleMutation,
  type UserRoleMutationOptions,
} from "./_userRoleMutation";

/**
 * `DELETE /api/users/{userId}/roles/{roleId}` — requires `users:unassign_role`.
 * Returns the updated user.
 */
export function useRemoveUserRole(options?: UserRoleMutationOptions) {
  return useUserRoleMutation("DELETE", options);
}

export default useRemoveUserRole;
