export type BackendStatusState = "loading" | "online" | "offline";

export interface BackendStatusTranslations {
  title: string;
  loading: string;
  online: string;
  offline: string;
  apiLabel: string;
  retryButtonText: string;
}

export interface BackendStatusCallbacks {
  onRetry: () => void;
}

export interface BackendStatusUIProps {
  state: BackendStatusState;
  /** Backend health message (`"pong"`), or the failure reason. */
  detail?: string | null;
  translations?: Partial<BackendStatusTranslations>;
  callbacks: BackendStatusCallbacks;
}

const defaultTranslations: BackendStatusTranslations = {
  title: "Backend connectivity",
  loading: "Contacting the API...",
  online: "API reachable",
  offline: "API unreachable",
  apiLabel: "GET /api/ping",
  retryButtonText: "Retry",
};

/**
 * Pure UI (Tier 1): primitives only, no data access.
 * Rendered by `BackendStatus.tsx` with data from `useGetBackendHealth`.
 */
export default function BackendStatusUI({
  state,
  detail = null,
  translations = {},
  callbacks,
}: BackendStatusUIProps) {
  const t = { ...defaultTranslations, ...translations };

  const statusLabels: Record<BackendStatusState, string> = {
    loading: t.loading,
    online: t.online,
    offline: t.offline,
  };

  const tone = {
    loading: "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300",
    online: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
    offline: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300",
  }[state];

  return (
    <section
      aria-live="polite"
      data-testid="backend-status"
      data-state={state}
      className={`w-full max-w-xl rounded-xl border p-5 shadow-sm ${tone}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            {t.title}
          </h2>
          <p className="text-base font-medium">{statusLabels[state]}</p>
          <p className="font-mono text-xs opacity-80">{t.apiLabel}</p>
          {detail && (
            <p className="text-xs opacity-90" data-testid="backend-status-detail">
              {detail}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={callbacks.onRetry}
          disabled={state === "loading"}
          className="shrink-0 rounded-md border border-current/30 px-3 py-1.5 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
        >
          {t.retryButtonText}
        </button>
      </div>
    </section>
  );
}
