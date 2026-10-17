import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import type { PasswordRecoveryRequest, PasswordRecoveryResponse } from "@/lib/types/customer";
import { useMutation } from "@tanstack/react-query";

/**
 * `POST /api/auth/recovery/request` — always `200` with `accepted: true`, whether or not the email
 * exists (no account enumeration). For a known, active account the response **also carries the raw
 * `reset_token`**, because the backend has no email delivery yet — see backend follow-up #11.
 */
export function useRequestPasswordRecovery(options?: {
  onSuccess?: (result: PasswordRecoveryResponse) => void;
  onError?: (error: ApiError) => void;
}) {
  return useMutation<PasswordRecoveryResponse, ApiError, PasswordRecoveryRequest>({
    mutationFn: (data) =>
      customFetcher<PasswordRecoveryResponse>({
        url: "/auth/recovery/request",
        method: "POST",
        data,
      }),
    onError: (error) => options?.onError?.(toApiError(error)),
    onSuccess: (result) => options?.onSuccess?.(result),
  });
}

export default useRequestPasswordRecovery;
