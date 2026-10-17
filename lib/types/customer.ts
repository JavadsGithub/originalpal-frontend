/**
 * Customer-account wire types — field-for-field copies of the backend's
 * `app/interface/dto/{user,customer_address}_dto.py` plus the request bodies the
 * `/api/auth/register`, `/api/auth/me`, `/api/auth/recovery/*` and `/api/me/addresses/*`
 * endpoints accept. Every shape here was confirmed against the live server
 * (`docs/integration/contract-audit.md` §11).
 */

import type { User } from "./auth";

/** The account record a customer owns; identical to the admin `User` DTO. */
export type CustomerProfile = User;

/**
 * `CustomerRegister` — the body of `POST /api/auth/register`.
 *
 * Unlike `POST /api/users/` (admin), this endpoint **activates** the account immediately, and it
 * does not issue a token: the customer signs in afterwards.
 */
export interface CustomerRegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
}

/**
 * `MyProfileUpdate` — the body of `PUT /api/auth/me`.
 *
 * `email` is deliberately absent: the backend rejects it (`extra="forbid"` → 422) and changing an
 * email needs a verification flow the backend does not have yet.
 */
export interface MyProfileUpdateRequest {
  first_name?: string;
  last_name?: string;
  username?: string;
}

/** `PasswordRecoveryRequest` — the body of `POST /api/auth/recovery/request`. */
export interface PasswordRecoveryRequest {
  email: string;
}

/**
 * `PasswordRecovery` — the payload of `POST /api/auth/recovery/request`.
 *
 * `accepted` is always `true` (the endpoint never reveals whether an email exists), but
 * `reset_token` is only populated for a known, active account — and it is the **raw token**, handed
 * back in the response because outbound email is not wired up yet (see backend follow-up #11).
 */
export interface PasswordRecoveryResponse {
  accepted: boolean;
  reset_token: string | null;
  expires_at: string | null;
}

/** `PasswordReset` — the body of `POST /api/auth/recovery/reset`. */
export interface PasswordResetRequest {
  token: string;
  new_password: string;
}

/** `CustomerAddress` DTO — one row of `GET /api/me/addresses/`. */
export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  country: string;
  city: string;
  address_line1: string;
  postal_code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * `CustomerAddressCreate` — the body of `POST /api/me/addresses/`.
 *
 * Every text field must be non-blank (the backend rejects blanks with a FastAPI 422), and the
 * **first** address becomes the default regardless of `is_default`.
 */
export interface CustomerAddressCreateRequest {
  label: string;
  recipient_name: string;
  phone: string;
  country: string;
  city: string;
  address_line1: string;
  postal_code: string;
  is_default?: boolean;
}

/** `CustomerAddressUpdate` — omitted fields are preserved; `is_default: true` clears the others. */
export type CustomerAddressUpdateRequest = Partial<
  Omit<CustomerAddressCreateRequest, "is_default">
> & { is_default?: boolean };

/** The editable address fields, as the form holds them (all strings). */
export interface AddressFormValues {
  label: string;
  recipientName: string;
  phone: string;
  country: string;
  city: string;
  addressLine1: string;
  postalCode: string;
  isDefault: boolean;
}

/** Registration form values, as the form holds them. */
export interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
}

/** Profile form values, as the form holds them. */
export interface ProfileFormValues {
  firstName: string;
  lastName: string;
  username: string;
}
