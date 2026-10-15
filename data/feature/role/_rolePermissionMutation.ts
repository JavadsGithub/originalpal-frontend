import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import type { Role } from "@/lib/types/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateRoleCaches } from "./_roleInvalidation";

/**
 * Internal factory shared by `useAssignPermissionToRole` and `useUnassignPermissionFromRole`.
 * Both endpoints return the updated role.
 */
export interface RolePermissionVariables {
  roleId: string;
  permissionId: string;
}

export interface RoleMutationOptions<Result> {
  onSuccess?: (result: Result) => void;
  onError?: (error: ReturnType<typeof toApiError>) => void;
}

export function useRolePermissionMutation(
  method: "POST" | "DELETE",
  options?: RoleMutationOptions<Role>,
) {
  const queryClient = useQueryClient();

  return useMutation<Role, ReturnType<typeof toApiError>, RolePermissionVariables>({
    mutationFn: ({ roleId, permissionId }) =>
      customFetcher<Role>({
        url: `/roles/${roleId}/permissions/${permissionId}`,
        method,
      }),
    onSuccess: (role) => {
      invalidateRoleCaches(queryClient, role.id);
      options?.onSuccess?.(role);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}
