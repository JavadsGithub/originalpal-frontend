import Axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { PUBLIC_API_BASE_URL } from "./config";
import { ApiError } from "./api-error";
import type { StandardResponse } from "./types/api";
import type { TokenResponse } from "./types/auth";

/**
 * Networking layer for the Original Pal backend.
 *
 * Responsibilities:
 *  - attach the in-memory access token to every request;
 *  - unwrap the `StandardResponse<T>` envelope so callers receive `payload` directly;
 *  - on 401, run **one** single-flight `POST /auth/refresh` (cookie based) and replay the
 *    original request once — the backend rotates the access token, never the cookie;
 *  - normalise every failure into `ApiError`;
 *  - announce session expiry so the UI can react (see `subscribeToSession`).
 *
 * The refresh token lives in an HttpOnly cookie owned by the backend. Nothing in this file
 * reads or writes it. Because the access token is memory-only, a hard reload always costs one
 * silent refresh before `GET /auth/me` — that is the designed flow, not a leak.
 */

/** Per-request escape hatches understood by the interceptors. */
export interface RequestOptions {
  /** Skip the 401 → refresh → replay dance (used by `/auth/login`, `/auth/refresh`, `/auth/logout`). */
  skipAuthRefresh?: boolean;
}

type AppRequestConfig = InternalAxiosRequestConfig & RequestOptions & {
  _retried?: boolean;
};

const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/register",
  "/auth/recovery",
];

function isAuthEndpoint(url?: string): boolean {
  if (!url) return false;
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

function extractPath(config: AxiosRequestConfig): string {
  if (config.url) return config.url;
  if (config.baseURL) return config.baseURL;
  return "";
}

// ---------------------------------------------------------------------------
// Access token store (memory only — never localStorage)
// ---------------------------------------------------------------------------

let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => accessToken;

// ---------------------------------------------------------------------------
// Session events
// ---------------------------------------------------------------------------

export type SessionEvent =
  | { type: "token-refreshed"; token: string }
  | { type: "session-expired" }
  | { type: "logged-out" };

type SessionListener = (event: SessionEvent) => void;

const sessionListeners = new Set<SessionListener>();

/** Subscribe to auth lifecycle events. Returns an unsubscribe function. */
export const subscribeToSession = (listener: SessionListener): (() => void) => {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
};

const emitSessionEvent = (event: SessionEvent): void => {
  sessionListeners.forEach((listener) => listener(event));
};

/** Announces a deliberate logout so listeners can reset their cached identity. */
export const notifyLoggedOut = (): void => {
  emitSessionEvent({ type: "logged-out" });
};

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

export const AXIOS_INSTANCE = Axios.create({
  baseURL: PUBLIC_API_BASE_URL,
  withCredentials: true,
  // No global Content-Type: axios derives it per request, which keeps future
  // multipart uploads (`POST /api/upload`) working without header surgery.
});

AXIOS_INSTANCE.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return config;
});

/**
 * Exchanges the HttpOnly refresh cookie for a new access token.
 * Single-flight: concurrent 401s share one refresh request.
 */
let refreshInFlight: Promise<string> | null = null;

export const refreshAccessToken = (): Promise<string> => {
  if (!refreshInFlight) {
    refreshInFlight = (async (): Promise<string> => {
      try {
        // Bare axios call: must not pass through the interceptors below.
        const response = await Axios.post<StandardResponse<TokenResponse>>(
          `${PUBLIC_API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const token = response.data?.payload?.token;
        if (!token) {
          throw new ApiError({
            message: "The refresh endpoint returned no access token",
            status: 401,
            errorCode: "CREDENTIALS_VALIDATION_ERROR",
          });
        }

        setAccessToken(token);
        emitSessionEvent({ type: "token-refreshed", token });
        return token;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
};

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as AppRequestConfig | undefined;
    const path = extractPath(error.config ?? {});

    const shouldRefresh =
      error.response?.status === 401 &&
      request !== undefined &&
      !request._retried &&
      !request.skipAuthRefresh &&
      !isAuthEndpoint(path);

    if (!shouldRefresh) {
      return Promise.reject(ApiError.from(error));
    }

    request._retried = true;

    try {
      const token = await refreshAccessToken();
      request.headers = AxiosHeaders.from(request.headers);
      request.headers.set("Authorization", `Bearer ${token}`);
      return await AXIOS_INSTANCE(request);
    } catch (refreshError) {
      setAccessToken(null);
      emitSessionEvent({ type: "session-expired" });
      return Promise.reject(ApiError.from(refreshError));
    }
  },
);

// ---------------------------------------------------------------------------
// Envelope handling
// ---------------------------------------------------------------------------

function isEnvelope(data: unknown): data is StandardResponse<unknown> {
  return (
    typeof data === "object" &&
    data !== null &&
    "success" in data &&
    "payload" in data
  );
}

/**
 * Performs a request and returns the envelope's `payload`.
 * `payload: null` (message-only endpoints such as `GET /api/ping`) resolves to `null`.
 */
export const customFetcher = async <T>(
  config: AxiosRequestConfig & RequestOptions,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const response = await AXIOS_INSTANCE({ ...config, ...options });
  const data = response.data;

  if (isEnvelope(data)) {
    return data.payload as T;
  }

  return data as T;
};

/**
 * Same as `customFetcher`, but keeps the envelope.
 * Use it for message-carrying endpoints where `payload` is null but `message` is the answer
 * (e.g. `GET /api/ping` → `{"success": true, "message": "pong", "payload": null}`).
 */
export const fetchEnvelope = async <T>(
  config: AxiosRequestConfig & RequestOptions,
  options?: AxiosRequestConfig,
): Promise<StandardResponse<T>> => {
  const response = await AXIOS_INSTANCE({ ...config, ...options });
  const data = response.data;

  if (isEnvelope(data)) {
    return data as StandardResponse<T>;
  }

  return { success: true, message: "", payload: data as T };
};

/**
 * Adapter for orval's `react-query` client: it hands us `(url, RequestInit)` instead of an
 * axios config. Kept in sync with the `fetch`-style signature orval generates.
 */
export const fetcherHookAdapter = <T>(
  url: string,
  options?: RequestInit & RequestOptions,
): Promise<T> => {
  let bodyData: unknown;

  if (options && "body" in options) {
    const rawBody = (options as { body?: unknown }).body;
    if (typeof rawBody === "string") {
      try {
        bodyData = JSON.parse(rawBody);
      } catch {
        bodyData = rawBody;
      }
    } else {
      bodyData = rawBody;
    }
  }

  const config: AxiosRequestConfig & RequestOptions = {
    url,
    method: (options?.method as AxiosRequestConfig["method"]) ?? "GET",
    headers: options?.headers as Record<string, string>,
    signal: options?.signal ?? undefined,
    data: bodyData,
    skipAuthRefresh: options?.skipAuthRefresh,
  };

  return customFetcher<T>(config);
};

// Types consumed by orval-generated code.
export type ErrorType<TError> = AxiosError<TError>;
export type BodyType<TBody> = TBody;
