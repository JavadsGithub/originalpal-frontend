import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import type { CustomerAddress, CustomerAddressCreateRequest } from "@/lib/types/customer";
import { customerKeys } from "@/data/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * `POST /api/me/addresses/` — every text field must be non-blank and the **first** address becomes
 * the default even when `is_default` is omitted (the backend forces it), so the UI does not claim
 * otherwise.
 */
export function useCreateAddress(options?: {
  onSuccess?: (address: CustomerAddress) => void;
  onError?: (error: ApiError) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<CustomerAddress, ApiError, CustomerAddressCreateRequest>({
    mutationFn: (data) =>
      customFetcher<CustomerAddress>({ url: "/me/addresses/", method: "POST", data }),
    onSuccess: (address) => {
      // Creating a default address flips `is_default` on the others, so the whole list is refreshed.
      void queryClient.invalidateQueries({ queryKey: customerKeys.addresses.all() });
      options?.onSuccess?.(address);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useCreateAddress;
