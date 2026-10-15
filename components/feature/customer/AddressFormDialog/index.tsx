"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AddressFormValues } from "@/lib/types/customer";
import { useState } from "react";

export interface AddressFormDialogTranslations {
  createTitle: string;
  editTitle: string;
  description: string;
  labelLabel: string;
  recipientLabel: string;
  phoneLabel: string;
  countryLabel: string;
  cityLabel: string;
  addressLine1Label: string;
  postalCodeLabel: string;
  defaultLabel: string;
  defaultHint: string;
  submitCreate: string;
  submitEdit: string;
  submitting: string;
  cancel: string;
}

export interface AddressFormDialogCallbacks {
  onSubmit: (values: AddressFormValues) => void;
  onCancel: () => void;
}

export interface AddressFormDialogUIProps {
  mode: "create" | "edit";
  initialValues?: Partial<AddressFormValues>;
  /** True when this customer has no address yet — the API force-defaults the first one. */
  isFirstAddress?: boolean;
  submitting?: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  translations?: Partial<AddressFormDialogTranslations>;
  callbacks: AddressFormDialogCallbacks;
}

const emptyValues: AddressFormValues = {
  label: "",
  recipientName: "",
  phone: "",
  country: "",
  city: "",
  addressLine1: "",
  postalCode: "",
  isDefault: false,
};

const defaultTranslations: AddressFormDialogTranslations = {
  createTitle: "New address",
  editTitle: "Edit address",
  description: "Every field is required and must not be blank — the API rejects blanks with a 422.",
  labelLabel: "Label",
  recipientLabel: "Recipient name",
  phoneLabel: "Phone",
  countryLabel: "Country",
  cityLabel: "City",
  addressLine1Label: "Address line",
  postalCodeLabel: "Postal code",
  defaultLabel: "Default address",
  defaultHint: "Making this the default clears the flag on your other addresses.",
  submitCreate: "Add address",
  submitEdit: "Save changes",
  submitting: "Saving...",
  cancel: "Cancel",
};

/** Tier 1 pure UI for creating and editing a customer address. */
export default function AddressFormDialogUI({
  mode,
  initialValues,
  isFirstAddress = false,
  submitting = false,
  errorMessage = null,
  fieldErrors = {},
  translations = {},
  callbacks,
}: AddressFormDialogUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const [values, setValues] = useState<AddressFormValues>({ ...emptyValues, ...initialValues });

  const setValue = <K extends keyof AddressFormValues>(field: K, value: AddressFormValues[K]) =>
    setValues((current) => ({ ...current, [field]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    callbacks.onSubmit(values);
  };

  const textField = (
    field: Exclude<keyof AddressFormValues, "isDefault">,
    id: string,
    label: string,
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={values[field]}
        disabled={submitting}
        aria-invalid={Boolean(fieldErrors[field])}
        onChange={(event) => setValue(field, event.target.value)}
      />
      {fieldErrors[field] && <p className="text-xs text-destructive">{fieldErrors[field]}</p>}
    </div>
  );

  return (
    <Dialog
      open
      onClose={callbacks.onCancel}
      title={mode === "create" ? t.createTitle : t.editTitle}
      description={t.description}
      busy={submitting}
      footer={
        <>
          <Button type="button" variant="outline" disabled={submitting} onClick={callbacks.onCancel}>
            {t.cancel}
          </Button>
          <Button type="submit" form="address-form" disabled={submitting}>
            {submitting ? t.submitting : mode === "create" ? t.submitCreate : t.submitEdit}
          </Button>
        </>
      }
    >
      <form id="address-form" onSubmit={handleSubmit} className="space-y-4" data-testid="address-form">
        <FormError message={errorMessage} data-testid="address-form-error" />

        <div className="grid gap-4 sm:grid-cols-2">
          {textField("label", "address-label", t.labelLabel)}
          {textField("recipientName", "address-recipient", t.recipientLabel)}
        </div>

        {textField("phone", "address-phone", t.phoneLabel)}

        <div className="grid gap-4 sm:grid-cols-2">
          {textField("country", "address-country", t.countryLabel)}
          {textField("city", "address-city", t.cityLabel)}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {textField("addressLine1", "address-line1", t.addressLine1Label)}
          {textField("postalCode", "address-postal-code", t.postalCodeLabel)}
        </div>

        <div className="space-y-1">
          <Checkbox
            id="address-is-default"
            label={t.defaultLabel}
            checked={isFirstAddress || values.isDefault}
            disabled={submitting || isFirstAddress}
            onChange={(event) => setValue("isDefault", event.target.checked)}
          />
          <p className="text-xs text-muted-foreground">
            {isFirstAddress
              ? "This is your first address, so the API makes it the default."
              : t.defaultHint}
          </p>
        </div>
      </form>
    </Dialog>
  );
}
