import { customFetcher, setAccessToken } from "@/lib/fetcher";
import type { TokenResponse } from "@/lib/types/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UseLoginOptions {
  onSuccess?: (data: TokenResponse) => void;
  onError?: (error: Error) => void;
}

export function useLogin(options?: UseLoginOptions) {
  const queryClient = useQueryClient();

  return useMutation<TokenResponse, Error, LoginCredentials>({
    mutationFn: (credentials) =>
      customFetcher<TokenResponse>({
        url: "/auth/login",
        method: "POST",
        data: credentials,
      }),
    onSuccess: (data) => {
      if (data?.token) {
        setAccessToken(data.token);
      }
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
}

export default useLogin;
