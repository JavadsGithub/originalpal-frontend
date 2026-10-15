import type { NextConfig } from "next";

/**
 * Same-origin API proxy (see docs/integration/contract-audit.md §2).
 *
 * The browser calls `/api/*` on its own origin; `app/api/[...path]/route.ts` forwards those
 * requests to the FastAPI backend (`API_PROXY_TARGET`, default `http://127.0.0.1:8004`). That keeps
 * the backend's HttpOnly `refresh_token` cookie first-party, removes CORS from the browser path
 * entirely, and lets the sandbox Preview reach a backend that only listens inside the sandbox.
 *
 * A route handler is used instead of `rewrites()` on purpose — rewrites normalise trailing slashes
 * and pass the backend's absolute `Location` header through, both of which break the contract.
 */

/** Extra dev origins, e.g. a self-hosted preview host. Comma separated, wildcards supported. */
const DEV_ALLOWED_ORIGINS = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  /**
   * The backend declares collection routes with a trailing slash (`/api/users/`) and answers a
   * missing one with a 307. Disable Next's own trailing-slash redirect so the proxy receives the
   * caller's path untouched and forwards it verbatim.
   */
  skipTrailingSlashRedirect: true,

  // `next dev` rejects requests from unknown origins. The sandbox Preview serves this app from a
  // generated host, so allow it (plus anything in DEV_ALLOWED_ORIGINS) while developing.
  allowedDevOrigins: ["*.e2b.app", "*.arena.ai", ...DEV_ALLOWED_ORIGINS],
};

export default nextConfig;
