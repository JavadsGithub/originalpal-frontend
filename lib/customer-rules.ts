/**
 * Client-side mirrors of the customer-account validators, with the messages the live server uses.
 *
 * The API stays the authority — every one of these rules was observed on the running backend
 * (`docs/integration/contract-audit.md` §11) and the UI only uses them to answer before the round
 * trip. `fieldErrors` from an actual `422` always wins over what is computed here.
 */

import type { AddressFormValues, ProfileFormValues, RegisterFormValues } from "./types/customer";

/** `UserEntity._validate_password`: at least 8 characters, no other rules. */
export const MIN_PASSWORD_LENGTH = 8;

/** The message the backend returns when a password is too short. */
export const PASSWORD_TOO_SHORT_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;

const REQUIRED_MESSAGE = "This field is required";

/** `POST /api/auth/register` — all five fields are required, the password has a minimum length. */
export function validateRegistration(values: RegisterFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const required: Array<[keyof RegisterFormValues, string]> = [
    ["firstName", "first_name"],
    ["lastName", "last_name"],
    ["email", "email"],
    ["username", "username"],
  ];

  for (const [field] of required) {
    if (!values[field].trim()) errors[field] = REQUIRED_MESSAGE;
  }

  if (!values.password) {
    errors.password = REQUIRED_MESSAGE;
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = PASSWORD_TOO_SHORT_MESSAGE;
  }

  return errors;
}

/**
 * `PUT /api/auth/me` — the backend refuses a body with no fields at all
 * (`422 field=profile`, "At least one profile field is required"), so an empty form is an error
 * rather than a no-op.
 */
export function validateProfileUpdate(values: ProfileFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const submitted = [values.firstName, values.lastName, values.username].some((value) =>
    value.trim(),
  );

  if (!submitted) {
    errors.profile = "Fill in at least one field to update";
  }

  for (const field of ["firstName", "lastName", "username"] as const) {
    if (values[field] !== "" && !values[field].trim()) {
      errors[field] = REQUIRED_MESSAGE;
    }
  }

  return errors;
}

/** `CustomerAddressCreate` — seven required text fields, all of them non-blank. */
export function validateAddress(values: AddressFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const required: Array<Exclude<keyof AddressFormValues, "isDefault">> = [
    "label",
    "recipientName",
    "phone",
    "country",
    "city",
    "addressLine1",
    "postalCode",
  ];

  for (const field of required) {
    if (!values[field].trim()) errors[field] = REQUIRED_MESSAGE;
  }

  return errors;
}

/** `POST /api/auth/recovery/reset` — the token is required and the new password has a minimum. */
export function validatePasswordReset(token: string, newPassword: string): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!token.trim()) errors.token = "Paste the recovery token from the previous step";
  if (!newPassword) {
    errors.newPassword = REQUIRED_MESSAGE;
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = PASSWORD_TOO_SHORT_MESSAGE;
  }

  return errors;
}

/** One-line rendering of an address, used by the address book and (later) checkout. */
export function formatAddressLine(address: {
  address_line1: string;
  city: string;
  postal_code: string;
  country: string;
}): string {
  return `${address.address_line1}, ${address.city} ${address.postal_code}, ${address.country}`;
}
