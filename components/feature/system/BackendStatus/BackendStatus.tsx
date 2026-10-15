"use client";

import useGetBackendHealth from "@/data/feature/system/useGetBackendHealth";
import BackendStatusUI, { type BackendStatusState } from "./index";

export interface BackendStatusProps {
  translations?: Parameters<typeof BackendStatusUI>[0]["translations"];
}

/**
 * Dependency Injector (Tier 2) for `BackendStatus`.
 *
 * Exists to prove — and to keep proving — that the full chain works: browser → same-origin
 * Next.js proxy → FastAPI, including the `StandardResponse` envelope. Drop it into any layout or
 * diagnostics page.
 */
export default function BackendStatus({ translations }: BackendStatusProps) {
  const { isReachable, message, isLoading, error, refetch } =
    useGetBackendHealth();

  const state: BackendStatusState = isLoading
    ? "loading"
    : isReachable
      ? "online"
      : "offline";

  const detail = isLoading
    ? null
    : isReachable
      ? message
      : (error?.message ?? null);

  return (
    <BackendStatusUI
      state={state}
      detail={detail}
      translations={translations}
      callbacks={{
        onRetry: () => {
          void refetch();
        },
      }}
    />
  );
}
