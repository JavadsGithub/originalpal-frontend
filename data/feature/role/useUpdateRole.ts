import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import type { Role, RoleUpdateRequest } from "@/lib/types/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateRoleCaches } from "./_roleInvalidation";
import type { RoleMutationOptions } from "./_rolePermissionMutation";

export interface UpdateRoleVariables {
  id: string;
  data: RoleUpdateRequest;
}

/** `PUT /api/roles/{id}` — requires `roles:update`. Omitted fields are preserved. */
export function useUpdateRole(options?: RoleMutationOptions<Role>) {
  const queryClient = useQueryClient();

  return useMutation<Role, ReturnType<typeof toApiError>, UpdateRoleVariables>({
    mutationFn: ({ id, data }) =>
      customFetcher<Role>({ url: `/roles/${id}`, method: "PUT", data }),
    onSuccess: (role) => {
      invalidateRoleCaches(queryClient, role.id);
      options?.onSuccess?.(role);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useUpdateRole;
