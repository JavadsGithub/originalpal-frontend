import Axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import type { StandardResponse, TokenResponse } from "./types/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL_V1 ||
  "http://localhost:8004/api";

let accessToken: string | null = null;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = (): string | null => {
  return accessToken;
};

export const AXIOS_INSTANCE = Axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

AXIOS_INSTANCE.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return AXIOS_INSTANCE(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await Axios.post<StandardResponse<TokenResponse>>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = refreshResponse.data.payload?.token;
        if (newToken) {
          setAccessToken(newToken);
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return AXIOS_INSTANCE(originalRequest);
        } else {
          throw new Error("No token returned in refresh response");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export const customFetcher = async <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const response = await AXIOS_INSTANCE({
    ...config,
    ...options,
  });

  const data = response.data;

  // If the backend wraps the output in StandardResponse { success, message, payload }
  if (
    data &&
    typeof data === "object" &&
    "payload" in data &&
    "success" in data
  ) {
    return (data as StandardResponse<T>).payload;
  }

  return data as T;
};

export const fetcherHookAdapter = <T>(
  url: string,
  options?: RequestInit,
): Promise<T> => {
  let bodyData: unknown = undefined;
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

  const config: AxiosRequestConfig = {
    url,
    method: (options?.method as AxiosRequestConfig["method"]) ?? "GET",
    headers: options?.headers as Record<string, string>,
    signal: options?.signal ?? undefined,
    data: bodyData,
  };

  return customFetcher<T>(config);
};

export type ErrorType<Error> = AxiosError<Error>;
export type BodyType<BodyData> = BodyData;
