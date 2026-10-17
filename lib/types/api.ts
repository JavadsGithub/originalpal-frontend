/**
 * Wire-format types for the Original Pal FastAPI backend.
 *
 * Verified against the live backend (`originalpal-server-python` @ 3d82827): every endpoint
 * responds with the `StandardResponse` envelope, except FastAPI's own request-validation
 * errors, which return `{ "detail": [...] }` — both shapes are normalised by `lib/api-error.ts`.
 */

/** Every successful (and most failing) backend response is wrapped in this envelope. */
export interface StandardResponse<T = unknown> {
  success: boolean;
  message: string;
  /** `null` for message-only endpoints, e.g. `GET /api/ping` and `POST /api/auth/logout`. */
  payload: T | null;
}

/** Failure payload produced by the backend's domain exception handlers. */
export interface ApiErrorPayload {
  error_code?: string;
  details?: Record<string, unknown>;
  status_code?: number;
  /** Present only on unhandled 500s (`{"payload": {"code": 500}}`). */
  code?: number;
}

/** One entry of FastAPI's default `RequestValidationError` list (HTTP 422). */
export interface RequestValidationIssue {
  type: string;
  loc: Array<string | number>;
  msg: string;
  input?: unknown;
}

export const ApiErrorCode = {
  Validation: "VALIDATION_ERROR",
  ResourceNotFound: "RESOURCE_NOT_FOUND",
  Unauthorized: "UNAUTHORIZED",
  CredentialsValidation: "CREDENTIALS_VALIDATION_ERROR",
  InactiveUser: "INACTIVE_USER",
  Forbidden: "FORBIDDEN",
  Conflict: "CONFLICT",
  Business: "BUSINESS_ERROR",
  Network: "NETWORK_ERROR",
  Unknown: "UNKNOWN_ERROR",
} as const;

export type ApiErrorCodeValue =
  (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

/** Paginated payload returned by every collection endpoint (`fastapi_pagination.Page`). */
export interface PaginatedPayload<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number | null;
}

/** Query parameters accepted by paginated collection endpoints. */
export interface PageParams {
  page?: number;
  size?: number;
}

export const DEFAULT_PAGE = 1;
/** Backend default is 10 (`DEFAULT_PAGINATION_LIMIT`); the frontend asks for more per screen. */
export const DEFAULT_PAGE_SIZE = 50;

/** Normalises a possibly-partial page payload into a predictable shape. */
export function normalizePage<T>(
  payload: PaginatedPayload<T> | null | undefined,
  fallback: PageParams = {},
): PaginatedPayload<T> {
  return {
    items: payload?.items ?? [],
    total: payload?.total ?? 0,
    page: payload?.page ?? fallback.page ?? DEFAULT_PAGE,
    size: payload?.size ?? fallback.size ?? DEFAULT_PAGE_SIZE,
    pages: payload?.pages ?? 0,
  };
}
