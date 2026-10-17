import {
  customFetcher,
  notifyLoggedOut,
  setAccessToken,
} from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import { authKeys } from "@/data/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface UseLogoutOptions {
  onSuccess?: () => void;
  onError?: (error: ApiError) => void;
}

/**
 * Revokes the refresh token server-side and clears local identity.
 *
 * The backend answers `401 CREDENTIALS_VALIDATION_ERROR` when the refresh cookie is already gone
 * (e.g. logging out in a second tab). That is a successful logout from the user's point of view,
 * so it is swallowed rather than surfaced — and `skipAuthRefresh` prevents a pointless refresh.
 */
export function useLogout(options?: UseLogoutOptions) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, void>({
    mutationFn: async () => {
      try {
        await customFetcher<void>({
          url: "/auth/logout",
          method: "POST",
          skipAuthRefresh: true,
        });
      } catch (error) {
        const apiError = toApiError(error);
        if (!apiError.isUnauthorized) {
          throw apiError;
        }
      }
    },
    onSuccess: () => {
      clearLocalSession(queryClient);
      options?.onSuccess?.();
    },
    onError: (error) => {
      // Local state is cleared even when the server call fails: the user asked to log out.
      clearLocalSession(queryClient);
      options?.onError?.(toApiError(error));
    },
  });
}

function clearLocalSession(
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  setAccessToken(null);
  queryClient.setQueryData(authKeys.me(), null);
  queryClient.removeQueries({ queryKey: authKeys.all });
  queryClient.clear();
  notifyLoggedOut();
}

export default useLogout;
