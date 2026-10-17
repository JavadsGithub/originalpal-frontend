import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import type { CustomerProfile, MyProfileUpdateRequest } from "@/lib/types/customer";
import { authKeys, userKeys } from "@/data/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * `PUT /api/auth/me` — partial profile update (first name, last name, username).
 *
 * The endpoint takes **no permission**: any signed-in account may edit itself. The response is the
 * same `User` DTO as `GET /api/auth/me`, so the cached identity is replaced with it — otherwise the
 * header would keep showing the old name.
 */
export function useUpdateMyProfile(options?: {
  onSuccess?: (user: CustomerProfile) => void;
  onError?: (error: ApiError) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<CustomerProfile, ApiError, MyProfileUpdateRequest>({
    mutationFn: (data) => customFetcher<CustomerProfile>({ url: "/auth/me", method: "PUT", data }),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me(), user);
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      options?.onSuccess?.(user);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useUpdateMyProfile;
