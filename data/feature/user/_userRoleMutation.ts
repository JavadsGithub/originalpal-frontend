import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import type { User } from "@/lib/types/auth";
import { authKeys, userKeys } from "@/data/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Internal (underscore-prefixed) factory shared by `useAssignUserRole` and `useRemoveUserRole`:
 * both endpoints take the same variables and return the updated user.
 */
export interface UserRoleVariables {
  userId: string;
  roleId: string;
}

export interface UserRoleMutationOptions {
  onSuccess?: (user: User) => void;
  onError?: (error: ReturnType<typeof toApiError>) => void;
}

export function useUserRoleMutation(
  method: "POST" | "DELETE",
  options?: UserRoleMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation<User, ReturnType<typeof toApiError>, UserRoleVariables>({
    mutationFn: ({ userId, roleId }) =>
      customFetcher<User>({ url: `/users/${userId}/roles/${roleId}`, method }),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      // Changing your own roles changes your effective permissions.
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      options?.onSuccess?.(user);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}
