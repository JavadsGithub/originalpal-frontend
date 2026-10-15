"use client";

import useUpdateAddress from "@/data/feature/customer/useUpdateAddress";
import { toApiError } from "@/lib/api-error";
import { validateAddress } from "@/lib/customer-rules";
import type { AddressFormValues, CustomerAddress } from "@/lib/types/customer";
import { useState } from "react";
import AddressFormDialogUI from "./index";

export interface EditAddressDialogProps {
  address: CustomerAddress;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * `PUT /api/me/addresses/{id}` — only the fields that changed are sent, so an untouched form never
 * rewrites the row (and never trips the "must not be blank" validators with empty strings).
 */
export default function EditAddressDialog({ address, onClose, onSaved }: EditAddressDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const updateAddress = useUpdateAddress({
    onSuccess: () => {
      onSaved?.();
      onClose();
    },
  });

  const initialValues: AddressFormValues = {
    label: address.label,
    recipientName: address.recipient_name,
    phone: address.phone,
    country: address.country,
    city: address.city,
    addressLine1: address.address_line1,
    postalCode: address.postal_code,
    isDefault: address.is_default,
  };

  const handleSubmit = (values: AddressFormValues) => {
    setErrorMessage(null);

    const localErrors = validateAddress(values);
    setFieldErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    const data: Record<string, string | boolean> = {};
    if (values.label.trim() !== initialValues.label) data.label = values.label.trim();
    if (values.recipientName.trim() !== initialValues.recipientName)
      data.recipient_name = values.recipientName.trim();
    if (values.phone.trim() !== initialValues.phone) data.phone = values.phone.trim();
    if (values.country.trim() !== initialValues.country) data.country = values.country.trim();
    if (values.city.trim() !== initialValues.city) data.city = values.city.trim();
    if (values.addressLine1.trim() !== initialValues.addressLine1)
      data.address_line1 = values.addressLine1.trim();
    if (values.postalCode.trim() !== initialValues.postalCode)
      data.postal_code = values.postalCode.trim();
    if (values.isDefault && !initialValues.isDefault) data.is_default = true;

    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }

    updateAddress.mutate(
      { addressId: address.id, data },
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
      mode="edit"
      initialValues={initialValues}
      submitting={updateAddress.isPending}
      errorMessage={errorMessage}
      fieldErrors={fieldErrors}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
