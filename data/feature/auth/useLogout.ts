import { customFetcher, setAccessToken } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface UseLogoutOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useLogout(options?: UseLogoutOptions) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: () =>
      customFetcher<void>({
        url: "/auth/logout",
        method: "POST",
      }),
    onSuccess: () => {
      setAccessToken(null);
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.clear();
      options?.onSuccess?.();
    },
    onError: (error) => {
      // Even on error, clear local auth
      setAccessToken(null);
      queryClient.setQueryData(["auth", "me"], null);
      options?.onError?.(error);
    },
  });
}

export default useLogout;
