"use client";

import useGetAddresses from "@/data/feature/customer/useGetAddresses";
import useDeleteAddress from "@/data/feature/customer/useDeleteAddress";
import useUpdateAddress from "@/data/feature/customer/useUpdateAddress";
import AddressFormDialog from "@/components/feature/customer/AddressFormDialog/AddressFormDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/form-error";
import { toApiError, type ApiError } from "@/lib/api-error";
import { formatAddressLine } from "@/lib/customer-rules";
import type { CustomerAddress } from "@/lib/types/customer";
import { useState } from "react";
import AddressBookUI, { type AddressRowData } from "./index";

type Dialog =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; address: CustomerAddress }
  | { kind: "delete"; address: CustomerAddress };

/**
 * Tier 2 injector for the address book.
 *
 * All five endpoints are scoped by the token (`/api/me/addresses/*`); there is no permission to
 * check, and another customer's address answers `404`. "Make default" is a partial `PUT` with
 * `{is_default: true}`, which the backend applies by clearing the flag on the other rows.
 */
export default function AddressBook() {
  const [dialog, setDialog] = useState<Dialog>({ kind: "none" });
  const [busyAddressId, setBusyAddressId] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const { addresses, total, isLoading, isError, error: loadError, refetch } = useGetAddresses({
    page: 1,
    size: 100,
  });

  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  const rows: AddressRowData[] = addresses.map((address) => ({
    id: address.id,
    label: address.label,
    recipientName: address.recipient_name,
    line: formatAddressLine(address),
    phone: address.phone,
    isDefault: address.is_default,
  }));

  const handleMakeDefault = (addressId: string) => {
    setError(null);
    setBusyAddressId(addressId);
    updateAddress.mutate(
      { addressId, data: { is_default: true } },
      { onError: setError, onSettled: () => setBusyAddressId(null) },
    );
  };

  const handleDelete = (address: CustomerAddress) => {
    setError(null);
    setBusyAddressId(address.id);
    deleteAddress.mutate(address.id, {
      onSuccess: () => setDialog({ kind: "none" }),
      onError: (mutationError) => {
        setError(toApiError(mutationError));
        setDialog({ kind: "none" });
      },
      onSettled: () => setBusyAddressId(null),
    });
  };

  if (isLoading) {
    return (
      <div data-testid="addresses-loading" className="text-sm text-muted-foreground">
        Loading addresses...
      </div>
    );
  }

  if (isError) {
    return (
      <div data-testid="addresses-error" className="space-y-2 text-sm text-destructive">
        <p>{loadError?.message ?? "Failed to load addresses"}</p>
        <button type="button" className="underline" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {error && <FormError message={error.message} data-testid="addresses-action-error" />}

      <AddressBookUI
        addresses={rows}
        total={total}
        busyAddressId={busyAddressId}
        callbacks={{
          onCreate: () => setDialog({ kind: "create" }),
          onEdit: (addressId) => {
            const address = addresses.find((item) => item.id === addressId);
            if (address) setDialog({ kind: "edit", address });
          },
          onMakeDefault: handleMakeDefault,
          onDelete: (addressId) => {
            const address = addresses.find((item) => item.id === addressId);
            if (address) setDialog({ kind: "delete", address });
          },
        }}
      />

      {dialog.kind === "create" && (
        <AddressFormDialog
          isFirstAddress={total === 0}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}

      {dialog.kind === "edit" && (
        <AddressFormDialog
          address={dialog.address}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}

      {dialog.kind === "delete" && (
        <ConfirmDialog
          open
          destructive
          busy={busyAddressId === dialog.address.id}
          title={`Delete ${dialog.address.label}?`}
          description="The address disappears from your account. Orders that already used it are unaffected."
          translations={{ confirmButtonText: "Delete address" }}
          callbacks={{
            onConfirm: () => handleDelete(dialog.address),
            onCancel: () => setDialog({ kind: "none" }),
          }}
        />
      )}
    </>
  );
}
