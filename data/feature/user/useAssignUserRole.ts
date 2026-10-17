import {
  useUserRoleMutation,
  type UserRoleMutationOptions,
} from "./_userRoleMutation";

/**
 * `POST /api/users/{userId}/roles/{roleId}` — requires `users:assign_role`.
 * Returns the updated user.
 */
export function useAssignUserRole(options?: UserRoleMutationOptions) {
  return useUserRoleMutation("POST", options);
}

export default useAssignUserRole;
