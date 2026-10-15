/**
 * Single source of truth for runtime configuration.
 *
 * Transport model (see docs/integration/contract-audit.md §2):
 *  - The browser always calls its **own origin** (`/api/...`), and the Next.js server proxies
 *    `/api/*` to the FastAPI backend (`API_PROXY_TARGET`). This removes CORS from the browser
 *    path entirely and keeps the backend's `refresh_token` cookie first-party.
 *  - Setting `NEXT_PUBLIC_API_URL` to an absolute URL switches to direct browser → backend mode
 *    (useful behind a same-site gateway, or when the API is served under the same domain).
 */

/** Base URL used by browser-side code (axios, React Query hooks). Defaults to the same origin. */
export const PUBLIC_API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL?.trim() || "/api";

/**
 * Absolute origin of the FastAPI backend, used by the `/api/*` proxy route handler and by
 * server-side fetching. Never exposed to the browser.
 */
export const BACKEND_ORIGIN: string = (
  process.env.API_PROXY_TARGET?.trim() ||
  (process.env.NEXT_PUBLIC_API_URL?.trim()?.startsWith("http")
    ? process.env.NEXT_PUBLIC_API_URL.trim()
    : "") ||
  "http://127.0.0.1:8004"
).replace(/\/+$/, "");

/**
 * Absolute base URL used by server-side code (route handlers, RSC, server actions).
 * A relative URL cannot be fetched from Node, so this always resolves to an absolute origin.
 */
export const SERVER_API_BASE_URL = `${BACKEND_ORIGIN}/api`;

/** True when the browser talks to the backend through the Next.js proxy (the default). */
export const USES_API_PROXY = PUBLIC_API_BASE_URL.startsWith("/");

export const APP_NAME = "Original Pal";

export const isDevelopment = process.env.NODE_ENV === "development";
