import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import type { User } from "@/lib/types/auth";
import { userKeys } from "@/data/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface UpdateUserVariables {
  id: string;
  data: import("@/lib/types/auth").UserUpdateRequest;
}

/**
 * `PUT /api/users/{id}` — requires `users:update`.
 *
 * Also the **activation** control: accounts created through `POST /api/users/` or
 * `POST /api/auth/register` start inactive and cannot sign in until `{is_active: true}` is sent
 * (see docs/integration/contract-audit.md §4).
 */
export function useUpdateUser(options?: {
  onSuccess?: (user: User) => void;
  onError?: (error: ReturnType<typeof toApiError>) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<User, ReturnType<typeof toApiError>, UpdateUserVariables>({
    mutationFn: ({ id, data }) =>
      customFetcher<User>({ url: `/users/${id}`, method: "PUT", data }),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(user.id) });
      options?.onSuccess?.(user);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useUpdateUser;
