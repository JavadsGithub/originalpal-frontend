import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import type { Role } from "@/lib/types/auth";
import { authKeys, roleKeys } from "@/data/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RoleMutationOptions } from "./_rolePermissionMutation";

/** `DELETE /api/roles/{id}` — requires `roles:delete`. Returns the deleted role. */
export function useDeleteRole(options?: RoleMutationOptions<Role>) {
  const queryClient = useQueryClient();

  return useMutation<Role, ReturnType<typeof toApiError>, string>({
    mutationFn: (id) => customFetcher<Role>({ url: `/roles/${id}`, method: "DELETE" }),
    onSuccess: (role) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      queryClient.removeQueries({ queryKey: roleKeys.detail(role.id) });
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
      options?.onSuccess?.(role);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useDeleteRole;
