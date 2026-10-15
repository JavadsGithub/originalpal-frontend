"use client";

import CreateAddressDialog from "./CreateAddressDialog";
import EditAddressDialog from "./EditAddressDialog";
import type { CustomerAddress } from "@/lib/types/customer";

export type AddressFormDialogProps =
  | { address?: undefined; isFirstAddress?: boolean; onClose: () => void }
  | { address: CustomerAddress; isFirstAddress?: never; onClose: () => void };

/**
 * One entry point for both modes: the address book only has to decide *whether* it is editing an
 * existing row, and the right injector (create or edit) is chosen here.
 */
export default function AddressFormDialog(props: AddressFormDialogProps) {
  if (props.address) {
    return <EditAddressDialog address={props.address} onClose={props.onClose} />;
  }

  return (
    <CreateAddressDialog isFirstAddress={props.isFirstAddress} onClose={props.onClose} />
  );
}
