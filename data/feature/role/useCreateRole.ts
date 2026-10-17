import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import type { Role, RoleCreateRequest } from "@/lib/types/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateRoleCaches } from "./_roleInvalidation";
import type { RoleMutationOptions } from "./_rolePermissionMutation";

/** `POST /api/roles/` — requires `roles:create`. Accepts optional `permission_ids`. */
export function useCreateRole(options?: RoleMutationOptions<Role>) {
  const queryClient = useQueryClient();

  return useMutation<Role, ReturnType<typeof toApiError>, RoleCreateRequest>({
    mutationFn: (data) => customFetcher<Role>({ url: "/roles/", method: "POST", data }),
    onSuccess: (role) => {
      invalidateRoleCaches(queryClient, role.id);
      options?.onSuccess?.(role);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useCreateRole;
