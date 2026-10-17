import type { QueryClient } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toApiError, type ApiError } from "@/lib/api-error";

export interface CatalogMutationCallbacks<TData> {
  onSuccess?: (data: TData) => void;
  onError?: (error: ApiError) => void;
}

export interface ResourceMutationConfig<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Runs before the callbacks; receives the query client and the resolved data. */
  invalidate: (
    queryClient: QueryClient,
    data: TData,
    variables: TVariables,
  ) => void;
  callbacks?: CatalogMutationCallbacks<TData>;
}

/**
 * Shared shape of every catalog mutation: run the request, invalidate the entangled caches, then
 * hand the result to the caller. Errors are normalised to `ApiError` (so callers can read
 * `fieldErrors` / `errorCode`) instead of leaking axios errors into components.
 */
export function useResourceMutation<TData, TVariables>({
  mutationFn,
  invalidate,
  callbacks,
}: ResourceMutationConfig<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiError, TVariables>({
    mutationFn,
    onSuccess: (data, variables) => {
      invalidate(queryClient, data, variables);
      callbacks?.onSuccess?.(data);
    },
    onError: (error) => callbacks?.onError?.(toApiError(error)),
  });
}
