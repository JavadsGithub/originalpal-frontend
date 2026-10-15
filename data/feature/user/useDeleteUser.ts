import { customFetcher } from "@/lib/fetcher";
import { toApiError } from "@/lib/api-error";
import type { User } from "@/lib/types/auth";
import { userKeys } from "@/data/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/** `DELETE /api/users/{id}` — requires `users:delete`. Returns the deleted user. */
export function useDeleteUser(options?: {
  onSuccess?: (user: User) => void;
  onError?: (error: ReturnType<typeof toApiError>) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<User, ReturnType<typeof toApiError>, string>({
    mutationFn: (id) => customFetcher<User>({ url: `/users/${id}`, method: "DELETE" }),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.removeQueries({ queryKey: userKeys.detail(user.id) });
      options?.onSuccess?.(user);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useDeleteUser;
