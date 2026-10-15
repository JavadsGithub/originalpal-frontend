"use client";

import useCreateAddress from "@/data/feature/customer/useCreateAddress";
import { toApiError } from "@/lib/api-error";
import { validateAddress } from "@/lib/customer-rules";
import type { AddressFormValues } from "@/lib/types/customer";
import { useState } from "react";
import AddressFormDialogUI from "./index";

export interface CreateAddressDialogProps {
  /** The API force-defaults the customer's first address. */
  isFirstAddress?: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

/**
 * `POST /api/me/addresses/`.
 *
 * Local checks only cover "dangerously blank", which the backend refuses anyway; a `422` /
 * `BusinessException` from the API is rendered field-by-field via `fieldErrors`.
 */
export default function CreateAddressDialog({
  isFirstAddress = false,
  onClose,
  onCreated,
}: CreateAddressDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const createAddress = useCreateAddress({
    onSuccess: () => {
      onCreated?.();
      onClose();
    },
  });

  const handleSubmit = (values: AddressFormValues) => {
    setErrorMessage(null);

    const localErrors = validateAddress(values);
    setFieldErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    createAddress.mutate(
      {
        label: values.label.trim(),
        recipient_name: values.recipientName.trim(),
        phone: values.phone.trim(),
        country: values.country.trim(),
        city: values.city.trim(),
        address_line1: values.addressLine1.trim(),
        postal_code: values.postalCode.trim(),
        is_default: isFirstAddress ? true : values.isDefault,
      },
      {
        onError: (error) => {
          const apiError = toApiError(error);
          setErrorMessage(apiError.message);
          setFieldErrors(apiError.fieldErrors);
        },
      },
    );
  };

  return (
    <AddressFormDialogUI
      mode="create"
      isFirstAddress={isFirstAddress}
      submitting={createAddress.isPending}
      errorMessage={errorMessage}
      fieldErrors={fieldErrors}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
