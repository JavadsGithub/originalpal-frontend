import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import type { PasswordResetRequest } from "@/lib/types/customer";
import { useMutation } from "@tanstack/react-query";

/**
 * `POST /api/auth/recovery/reset` — consumes the token (single use, one hour) and answers with a
 * `null` payload. An unknown, expired or already-used token is a `401 CREDENTIALS_VALIDATION_ERROR`,
 * which is what the form shows instead of inventing a success.
 */
export function useResetPassword(options?: {
  onSuccess?: () => void;
  onError?: (error: ApiError) => void;
}) {
  return useMutation<null, ApiError, PasswordResetRequest>({
    mutationFn: (data) =>
      customFetcher<null>({ url: "/auth/recovery/reset", method: "POST", data }),
    onError: (error) => options?.onError?.(toApiError(error)),
    onSuccess: () => options?.onSuccess?.(),
  });
}

export default useResetPassword;
