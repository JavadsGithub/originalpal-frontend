import { customFetcher, setAccessToken } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import type { LoginRequest, TokenResponse } from "@/lib/types/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/data/query-keys";

/** Credentials accepted by `POST /api/auth/login`. */
export type LoginCredentials = LoginRequest;

export interface UseLoginOptions {
  onSuccess?: (data: TokenResponse) => void;
  onError?: (error: ApiError) => void;
}

/**
 * Exchanges credentials for an access token.
 *
 * The backend also sets the HttpOnly `refresh_token` cookie on this response; the proxy keeps it
 * on the frontend origin. `skipAuthRefresh` is essential — a failed login must never trigger the
 * 401 → refresh → retry loop.
 */
export function useLogin(options?: UseLoginOptions) {
  const queryClient = useQueryClient();

  return useMutation<TokenResponse, ApiError, LoginCredentials>({
    mutationFn: (credentials) =>
      customFetcher<TokenResponse>({
        url: "/auth/login",
        method: "POST",
        data: credentials,
        skipAuthRefresh: true,
      }),
    onSuccess: (data) => {
      if (data?.token) {
        setAccessToken(data.token);
      }
      // The identity now exists; `/auth/me` must be refetched rather than served from cache.
      queryClient.invalidateQueries({ queryKey: authKeys.all });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(toApiError(error));
    },
  });
}

export default useLogin;
