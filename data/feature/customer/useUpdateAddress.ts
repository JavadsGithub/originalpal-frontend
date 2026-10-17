import { customFetcher } from "@/lib/fetcher";
import { toApiError, type ApiError } from "@/lib/api-error";
import type { CustomerAddress, CustomerAddressUpdateRequest } from "@/lib/types/customer";
import { customerKeys } from "@/data/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface UpdateAddressVariables {
  addressId: string;
  data: CustomerAddressUpdateRequest;
}

/**
 * `PUT /api/me/addresses/{id}` — partial update; omitted fields keep their value. Sending
 * `is_default: true` clears the flag on the customer's other addresses.
 */
export function useUpdateAddress(options?: {
  onSuccess?: (address: CustomerAddress) => void;
  onError?: (error: ApiError) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation<CustomerAddress, ApiError, UpdateAddressVariables>({
    mutationFn: ({ addressId, data }) =>
      customFetcher<CustomerAddress>({ url: `/me/addresses/${addressId}`, method: "PUT", data }),
    onSuccess: (address) => {
      queryClient.setQueryData(customerKeys.addresses.detail(address.id), address);
      void queryClient.invalidateQueries({ queryKey: customerKeys.addresses.all() });
      options?.onSuccess?.(address);
    },
    onError: (error) => options?.onError?.(toApiError(error)),
  });
}

export default useUpdateAddress;
