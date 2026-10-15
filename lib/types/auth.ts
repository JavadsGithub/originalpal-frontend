/**
 * Auth / RBAC wire types — field-for-field copies of the backend DTOs in
 * `originalpal-server-python/app/interface/dto/{user,role,permission,auth}_dto.py`,
 * confirmed against live responses (`GET /api/auth/me`, `POST /api/auth/login`).
 */

export type { PaginatedPayload, StandardResponse } from "./api";
export type { PageParams } from "./api";

/** `Permission` DTO — `GET /api/auth/permissions`, `Role.permission_ids`. */
export interface Permission {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

/** `Role` DTO. `permission_ids` are permission UUIDs (see `lib/permissions.ts`). */
export interface Role {
  id: string;
  name: string;
  is_active: boolean;
  permission_ids: string[];
  created_at: string;
  updated_at: string;
}

/** `User` DTO — public projection, never contains `hashed_password`. */
export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  is_active: boolean;
  roles: Role[];
  created_at: string;
  updated_at: string;
}

/** `Token` DTO — the login/refresh payload of the standard envelope. */
export interface TokenResponse {
  title: string;
  token: string;
  type: string;
  expires_at: string;
}

/** `UserLogin` request body for `POST /api/auth/login`. */
export interface LoginRequest {
  username: string;
  password: string;
}

/** `CustomerRegister` request body for `POST /api/auth/register` (extra fields are rejected). */
export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
}

/** `MyProfileUpdate` request body for `PUT /api/auth/me` (omitted fields are preserved). */
export interface ProfileUpdateRequest {
  first_name?: string;
  last_name?: string;
  username?: string;
}

/** `PasswordRecoveryRequest` body for `POST /api/auth/recovery/request`. */
export interface PasswordRecoveryRequest {
  email: string;
}

/** `PasswordRecovery` payload — the token is only returned by this dev-oriented flow. */
export interface PasswordRecovery {
  accepted: boolean;
  reset_token: string | null;
  expires_at: string | null;
}

/** `PasswordReset` body for `POST /api/auth/recovery/reset`. */
export interface PasswordResetRequest {
  token: string;
  new_password: string;
}
