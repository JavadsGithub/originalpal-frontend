import { ApiErrorCode } from "./types/api";
import type {
  ApiErrorPayload,
  RequestValidationIssue,
  StandardResponse,
} from "./types/api";

interface AxiosLikeError {
  isAxiosError?: boolean;
  code?: string;
  message?: string;
  response?: {
    status?: number;
    data?: unknown;
  };
}

/**
 * Every API failure surfaced to the UI, regardless of which of the backend's error shapes
 * produced it (see docs/integration/contract-audit.md §3).
 */
export class ApiError extends Error {
  /** HTTP status, or 0 when the request never reached the server. */
  readonly status: number;
  readonly errorCode: string;
  readonly details: Record<string, unknown>;
  /** `{"username": "Field required"}` — ready for form display. */
  readonly fieldErrors: Record<string, string>;
  readonly isNetworkError: boolean;
  readonly isCanceled: boolean;

  constructor(init: {
    message: string;
    status?: number;
    errorCode?: string;
    details?: Record<string, unknown>;
    fieldErrors?: Record<string, string>;
    isNetworkError?: boolean;
    isCanceled?: boolean;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status ?? 0;
    this.errorCode = init.errorCode ?? ApiErrorCode.Unknown;
    this.details = init.details ?? {};
    this.fieldErrors = init.fieldErrors ?? {};
    this.isNetworkError = init.isNetworkError ?? false;
    this.isCanceled = init.isCanceled ?? false;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Authenticated, but the user lacks the required permission. Must not log the user out. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 422 || this.errorCode === ApiErrorCode.Validation;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;

    const candidate = error as AxiosLikeError | undefined;

    if (candidate?.isAxiosError) {
      return fromAxiosError(candidate);
    }

    if (error instanceof Error) {
      return new ApiError({
        message: error.message,
        errorCode: ApiErrorCode.Unknown,
      });
    }

    return new ApiError({
      message: "An unexpected error occurred",
      errorCode: ApiErrorCode.Unknown,
    });
  }
}

function fromAxiosError(error: AxiosLikeError): ApiError {
  if (error.code === "ERR_CANCELED") {
    return new ApiError({
      message: "Request canceled",
      errorCode: "REQUEST_CANCELED",
      isCanceled: true,
    });
  }

  const status = error.response?.status ?? 0;
  const data = error.response?.data;

  if (!error.response) {
    return new ApiError({
      message:
        "Cannot reach the API. Make sure the backend is running and the API proxy target is correct.",
      status: 0,
      errorCode: ApiErrorCode.Network,
      isNetworkError: true,
    });
  }

  return fromResponse(status, data);
}

function fromResponse(status: number, data: unknown): ApiError {
  // Shape A — the backend envelope: {success, message, payload:{error_code, details, status_code}}
  if (isEnvelope(data)) {
    const payload = (data.payload ?? {}) as ApiErrorPayload;
    return new ApiError({
      message: data.message || defaultMessage(status),
      status,
      errorCode: payload.error_code ?? ApiErrorCode.Unknown,
      details: payload.details ?? {},
      fieldErrors: extractFieldErrors(payload.details),
    });
  }

  // Shape B — FastAPI's own validation error: {"detail":[{"loc":["body","password"],"msg":"..."}]}
  if (isValidationList(data)) {
    return new ApiError({
      message: data.detail[0]?.msg ?? defaultMessage(status),
      status,
      errorCode: ApiErrorCode.Validation,
      details: { errors: data.detail },
      fieldErrors: validationListToFieldErrors(data.detail),
    });
  }

  // Shape C — FastAPI's simple detail string, e.g. 404 on an unknown route.
  if (isDetailString(data)) {
    return new ApiError({ message: data.detail, status });
  }

  return new ApiError({ message: defaultMessage(status), status });
}

function defaultMessage(status: number): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The requested resource was not found.";
  if (status >= 500) return "The server encountered an error. Please try again.";
  if (status === 0) return "Network error";
  return "The request could not be completed.";
}

function isEnvelope(data: unknown): data is StandardResponse<ApiErrorPayload> {
  return (
    typeof data === "object" &&
    data !== null &&
    "success" in data &&
    "message" in data &&
    typeof (data as { message?: unknown }).message === "string"
  );
}

function isValidationList(
  data: unknown,
): data is { detail: RequestValidationIssue[] } {
  return (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as { detail?: unknown }).detail)
  );
}

function isDetailString(data: unknown): data is { detail: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as { detail?: unknown }).detail === "string"
  );
}

function validationListToFieldErrors(
  issues: RequestValidationIssue[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of issues) {
    // ["body", "password"] → "password"; nested bodies keep their dotted path.
    const location = issue.loc.filter((part) => part !== "body" && part !== "query");
    const field = location.join(".");
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = issue.msg;
    }
  }

  return fieldErrors;
}

function extractFieldErrors(
  details: Record<string, unknown> | undefined,
): Record<string, string> {
  if (!details) return {};

  const errors = details.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return validationListToFieldErrors(errors as RequestValidationIssue[]);
  }

  // Backend `ValidationException(message, field="email")` puts a single field in details.
  if (typeof details.field === "string") {
    return { [details.field]: "" };
  }

  return {};
}

/** Convenience wrapper used across the data layer. */
export function toApiError(error: unknown): ApiError {
  return ApiError.from(error);
}
