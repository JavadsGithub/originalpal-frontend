import type { NextRequest } from "next/server";
import { BACKEND_ORIGIN } from "@/lib/config";

/**
 * Same-origin proxy for the FastAPI backend.
 *
 * Why a route handler instead of a `next.config.ts` rewrite:
 *  1. **Trailing slashes.** The backend declares collection routes as `/api/users/` and answers a
 *     missing slash with a 307. Rewrites normalise the path (`/api/users/` → `/api/users`), so the
 *     browser ended up bouncing through a redirect whose `Location` pointed at the backend's
 *     internal host. Here the incoming path is forwarded verbatim.
 *  2. **Redirect hygiene.** Any `Location` pointing at the backend origin is rewritten to the same
 *     relative path on this origin, so the browser never learns the internal host (which it cannot
 *     reach when the backend lives inside a sandbox).
 *  3. **Cookies.** Multiple `Set-Cookie` headers are forwarded individually, keeping the backend's
 *     `HttpOnly` `refresh_token` bound to the frontend origin.
 *
 * Static routes under `app/api/**` (e.g. `GET /api/health`) take precedence over this catch-all,
 * so frontend-owned endpoints keep working.
 */

export const dynamic = "force-dynamic";

/** Headers that must not be forwarded in either direction. */
const HOP_BY_HOP_HEADERS = [
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  // Length/encoding are recomputed: `fetch` decompresses and re-frames the body.
  "content-length",
  "content-encoding",
  // Let the runtime negotiate compression with the backend itself.
  "accept-encoding",
  // The upstream host is not this host.
  "host",
];

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;

  // Forward the caller's path byte-for-byte: keep the trailing slash when it is present.
  const hasTrailingSlash = request.nextUrl.pathname.endsWith("/");
  const relativePath = `/${path.join("/")}${hasTrailingSlash ? "/" : ""}`;
  const targetUrl = `${BACKEND_ORIGIN}/api${relativePath}${request.nextUrl.search}`;

  const requestHeaders = new Headers(request.headers);
  for (const header of HOP_BY_HOP_HEADERS) requestHeaders.delete(header);

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      body: METHODS_WITHOUT_BODY.has(request.method) ? undefined : request.body,
      redirect: "manual",
      // Required by Node's fetch when streaming a request body.
      ...(METHODS_WITHOUT_BODY.has(request.method) ? {} : { duplex: "half" }),
    } as RequestInit);
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: `Cannot reach the API at ${BACKEND_ORIGIN}. Is the backend running?`,
        payload: {
          error_code: "NETWORK_ERROR",
          details: { target: targetUrl, reason: (error as Error)?.message },
          status_code: 502,
        },
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(upstream.headers);
  for (const header of HOP_BY_HOP_HEADERS) responseHeaders.delete(header);

  // Keep redirects on this origin: the backend's Location is absolute.
  const location = responseHeaders.get("location");
  if (location) {
    const rewritten = toSameOriginLocation(location);
    if (rewritten) responseHeaders.set("location", rewritten);
  }

  // `Set-Cookie` is special: forward each cookie as its own header.
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    responseHeaders.delete("set-cookie");
    for (const cookie of setCookies) {
      responseHeaders.append("set-cookie", cookie);
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

/** `http://127.0.0.1:8004/api/users/` → `/api/users/` (returns null when it is another host). */
function toSameOriginLocation(location: string): string | null {
  try {
    const url = new URL(location, BACKEND_ORIGIN);
    if (url.origin !== BACKEND_ORIGIN) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const HEAD = proxyRequest;
export const OPTIONS = proxyRequest;
