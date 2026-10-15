"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface AddressRowData {
  id: string;
  label: string;
  recipientName: string;
  line: string;
  phone: string;
  isDefault: boolean;
}

export interface AddressBookTranslations {
  heading: string;
  description: string;
  createButtonText: string;
  emptyState: string;
  labelColumn: string;
  recipientColumn: string;
  addressColumn: string;
  phoneColumn: string;
  defaultBadge: string;
  editButtonText: string;
  deleteButtonText: string;
  defaultButtonText: string;
  totalLabel: string;
}

export interface AddressBookCallbacks {
  onCreate: () => void;
  onEdit: (addressId: string) => void;
  onMakeDefault: (addressId: string) => void;
  onDelete: (addressId: string) => void;
}

export interface AddressBookUIProps {
  addresses: AddressRowData[];
  total: number;
  busyAddressId?: string | null;
  translations?: Partial<AddressBookTranslations>;
  callbacks: AddressBookCallbacks;
}

const defaultTranslations: AddressBookTranslations = {
  heading: "Addresses",
  description:
    "Delivery addresses on your account. The first one is the default; making another default clears the previous one (the API guarantees a single default per customer).",
  createButtonText: "New address",
  emptyState: "No addresses yet — add one to speed up checkout.",
  labelColumn: "Label",
  recipientColumn: "Recipient",
  addressColumn: "Address",
  phoneColumn: "Phone",
  defaultBadge: "Default",
  editButtonText: "Edit",
  deleteButtonText: "Delete",
  defaultButtonText: "Make default",
  totalLabel: "total",
};

/**
 * Tier 1 pure UI for the customer address book.
 *
 * Deliberately plain: the addresses are the customer's own, so there is no permission gate — only a
 * "delete" confirmation and a one-click "make default", which is a partial `PUT` with
 * `{is_default: true}`.
 */
export default function AddressBookUI({
  addresses,
  total,
  busyAddressId = null,
  translations = {},
  callbacks,
}: AddressBookUIProps) {
  const t = { ...defaultTranslations, ...translations };

  return (
    <section className="space-y-4" data-testid="address-book">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{t.heading}</h2>
          <p className="max-w-2xl text-xs text-muted-foreground">{t.description}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground" data-testid="addresses-total">
            {total} {t.totalLabel}
          </span>
          <Button type="button" size="sm" onClick={callbacks.onCreate}>
            {t.createButtonText}
          </Button>
        </div>
      </header>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.labelColumn}</TableHead>
              <TableHead>{t.recipientColumn}</TableHead>
              <TableHead>{t.addressColumn}</TableHead>
              <TableHead>{t.phoneColumn}</TableHead>
              <TableHead className="text-right">—</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {addresses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  {t.emptyState}
                </TableCell>
              </TableRow>
            ) : (
              addresses.map((address) => {
                const isBusy = busyAddressId === address.id;

                return (
                  <TableRow key={address.id} data-testid={`address-row-${address.id}`}>
                    <TableCell>
                      <span className="font-medium text-foreground">{address.label}</span>
                      {address.isDefault && (
                        <Badge variant="success" className="ml-2">
                          {t.defaultBadge}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {address.recipientName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{address.line}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {address.phone}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!address.isDefault && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            disabled={isBusy}
                            data-testid={`make-default-${address.id}`}
                            onClick={() => callbacks.onMakeDefault(address.id)}
                          >
                            {t.defaultButtonText}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          disabled={isBusy}
                          onClick={() => callbacks.onEdit(address.id)}
                        >
                          {t.editButtonText}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="xs"
                          disabled={isBusy}
                          onClick={() => callbacks.onDelete(address.id)}
                        >
                          {t.deleteButtonText}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
