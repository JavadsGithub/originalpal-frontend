import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import type { User, UserCreateRequest } from "@/lib/types/auth";
import { userKeys } from "@/data/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * `POST /api/users/` — requires `users:create`.
 *
 * The backend creates the account **inactive** (`UserEntity.create` sets `is_active=False`), so an
 * admin must follow up with `PUT /api/users/{id}` `{is_active: true}` before the person can sign
 * in. The UI in `AdminUsersTable` surfaces that as a one-click "Activate".
 */
export function useCreateUser(options?: {
  onSuccess?: (user: User) => void;
  onError?: (error: ReturnType<typeof toApiError>) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<User, ReturnType<typeof toApiError>, UserCreateRequest>({
    mutationFn: (data) =>
      customFetcher<User>({ url: "/users/", method: "POST", data }),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      options?.onSuccess?.(user);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useCreateUser;
