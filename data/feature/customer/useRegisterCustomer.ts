import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import type { CustomerProfile, CustomerRegisterRequest } from "@/lib/types/customer";
import { userKeys } from "@/data/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * `POST /api/auth/register` — the customer-facing counterpart of `POST /api/users/`.
 *
 * Two differences that matter to the UI: the account is created **active** (the admin endpoint
 * leaves it inactive), and no token is issued, so the next step is the normal sign-in form.
 * Duplicate email/username answer `409 CONFLICT` with the offending value in the message.
 */
export function useRegisterCustomer(options?: {
  onSuccess?: (user: CustomerProfile) => void;
  onError?: (error: ApiError) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<CustomerProfile, ApiError, CustomerRegisterRequest>({
    mutationFn: (data) => customFetcher<CustomerProfile>({ url: "/auth/register", method: "POST", data }),
    onSuccess: (user) => {
      // The new account also shows up in the back office list.
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      options?.onSuccess?.(user);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useRegisterCustomer;
