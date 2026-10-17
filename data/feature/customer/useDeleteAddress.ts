import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import type { CustomerAddress } from "@/lib/types/customer";
import { customerKeys } from "@/data/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * `DELETE /api/me/addresses/{id}` — answers with the deleted row. Another customer's address answers
 * `404` (not `403`), which the UI can simply treat as "already gone".
 */
export function useDeleteAddress(options?: {
  onSuccess?: (address: CustomerAddress) => void;
  onError?: (error: ApiError) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<CustomerAddress, ApiError, string>({
    mutationFn: (addressId) =>
      customFetcher<CustomerAddress>({ url: `/me/addresses/${addressId}`, method: "DELETE" }),
    onSuccess: (address) => {
      void queryClient.invalidateQueries({ queryKey: customerKeys.addresses.all() });
      options?.onSuccess?.(address);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useDeleteAddress;
