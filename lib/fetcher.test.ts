import { beforeEach, describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { server } from "@/tests/msw-server";
import {
  TEST_API_BASE,
  accessToken,
  adminUser,
  badCredentialsHandler,
  loginHandler,
  meHandler,
  pingHandler,
  sessionExpired,
} from "@/tests/fixtures";
import {
  customFetcher,
  fetchEnvelope,
  getAccessToken,
  setAccessToken,
  subscribeToSession,
} from "./fetcher";
import { ApiError, toApiError } from "./api-error";

beforeEach(() => {
  setAccessToken(null);
});

describe("customFetcher", () => {
  it("unwraps the StandardResponse envelope", async () => {
    server.use(meHandler);

    const user = await customFetcher<typeof adminUser>({ url: "/auth/me", method: "GET" });

    expect(user.username).toBe("admin");
    expect(user.roles[0].name).toBe("Admin");
  });

  it("resolves message-only endpoints to null instead of throwing", async () => {
    server.use(pingHandler);

    await expect(customFetcher({ url: "/ping", method: "GET" })).resolves.toBeNull();
  });

  it("keeps the envelope available through fetchEnvelope", async () => {
    server.use(pingHandler);

    const envelope = await fetchEnvelope({ url: "/ping", method: "GET" });

    expect(envelope).toMatchObject({ success: true, message: "pong", payload: null });
  });

  it("attaches the in-memory access token as a bearer header", async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${TEST_API_BASE}/auth/me`, ({ request }) => {
        authorization = request.headers.get("authorization");
        return HttpResponse.json({ success: true, message: "ok", payload: adminUser });
      }),
    );

    setAccessToken(accessToken.token);
    await customFetcher({ url: "/auth/me", method: "GET" });

    expect(authorization).toBe(`Bearer ${accessToken.token}`);
  });

  it("normalises a failing domain response into ApiError", async () => {
    server.use(badCredentialsHandler);

    await expect(
      customFetcher({ url: "/auth/login", method: "POST", data: { username: "admin", password: "x" } }),
    ).rejects.toSatisfy((error: unknown) => {
      const apiError = toApiError(error);
      return apiError.isUnauthorized && apiError.message === "Incorrect username or password";
    });
  });
});

describe("token refresh", () => {
  it("refreshes once on 401 and replays the request with the new token", async () => {
    const seenTokens: Array<string | null> = [];
    let refreshCalls = 0;
    const events: string[] = [];
    subscribeToSession((event) => events.push(event.type));

    server.use(
      http.get(`${TEST_API_BASE}/auth/me`, ({ request }) => {
        const header = request.headers.get("authorization");
        seenTokens.push(header);
        if (header === "Bearer stale-token") {
          return HttpResponse.json(
            {
              success: false,
              message: "Could not validate credentials",
              payload: { error_code: "CREDENTIALS_VALIDATION_ERROR", details: {}, status_code: 401 },
            },
            { status: 401 },
          );
        }
        return HttpResponse.json({ success: true, message: "ok", payload: adminUser });
      }),
      http.post(`${TEST_API_BASE}/auth/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json({
          success: true,
          message: "Token refreshed successfully",
          payload: { ...accessToken, token: "fresh-token" },
        });
      }),
    );

    setAccessToken("stale-token");
    const user = await customFetcher<typeof adminUser>({ url: "/auth/me", method: "GET" });

    expect(user.username).toBe("admin");
    expect(refreshCalls).toBe(1);
    expect(seenTokens).toEqual(["Bearer stale-token", "Bearer fresh-token"]);
    expect(getAccessToken()).toBe("fresh-token");
    expect(events).toContain("token-refreshed");
  });

  it("coalesces concurrent 401s into a single refresh call", async () => {
    let refreshCalls = 0;
    server.use(
      http.get(`${TEST_API_BASE}/users/`, ({ request }) =>
        request.headers.get("authorization") === "Bearer fresh-token"
          ? HttpResponse.json({ success: true, message: "ok", payload: { items: [], total: 0, page: 1, size: 50, pages: 1 } })
          : HttpResponse.json(
              {
                success: false,
                message: "Could not validate credentials",
                payload: { error_code: "CREDENTIALS_VALIDATION_ERROR", details: {}, status_code: 401 },
              },
              { status: 401 },
            ),
      ),
      http.post(`${TEST_API_BASE}/auth/refresh`, async () => {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return HttpResponse.json({
          success: true,
          message: "Token refreshed successfully",
          payload: { ...accessToken, token: "fresh-token" },
        });
      }),
    );

    setAccessToken("stale-token");
    await Promise.all([
      customFetcher({ url: "/users/", method: "GET" }),
      customFetcher({ url: "/users/", method: "GET" }),
      customFetcher({ url: "/users/", method: "GET" }),
    ]);

    expect(refreshCalls).toBe(1);
  });

  it("emits session-expired when the refresh itself fails", async () => {
    const events: string[] = [];
    subscribeToSession((event) => events.push(event.type));
    server.use(
      http.get(`${TEST_API_BASE}/auth/me`, () =>
        HttpResponse.json(
          {
            success: false,
            message: "Could not validate credentials",
            payload: { error_code: "CREDENTIALS_VALIDATION_ERROR", details: {}, status_code: 401 },
          },
          { status: 401 },
        ),
      ),
      http.post(`${TEST_API_BASE}/auth/refresh`, () =>
        HttpResponse.json(
          {
            success: false,
            message: "No refresh token provided",
            payload: { error_code: "CREDENTIALS_VALIDATION_ERROR", details: {}, status_code: 401 },
          },
          { status: 401 },
        ),
      ),
    );

    setAccessToken("stale-token");
    await expect(customFetcher({ url: "/auth/me", method: "GET" })).rejects.toBeInstanceOf(ApiError);

    expect(events).toContain("session-expired");
    expect(getAccessToken()).toBeNull();
  });

  it("never refreshes for auth endpoints (no login loops)", async () => {
    let refreshCalls = 0;
    const events: string[] = [];
    subscribeToSession((event) => events.push(event.type));

    server.use(
      badCredentialsHandler,
      http.post(`${TEST_API_BASE}/auth/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json({ success: true, message: "ok", payload: accessToken });
      }),
    );

    await expect(
      customFetcher({ url: "/auth/login", method: "POST", data: { username: "admin", password: "x" } }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(refreshCalls).toBe(0);
    expect(events).toEqual([]);
  });

  it("skips the refresh when the caller opts out (e.g. logout)", async () => {
    let refreshCalls = 0;
    server.use(
      sessionExpired(`${TEST_API_BASE}/auth/logout`, "post"),
      http.post(`${TEST_API_BASE}/auth/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json({ success: true, message: "ok", payload: accessToken });
      }),
    );

    await expect(
      customFetcher({ url: "/auth/logout", method: "POST", skipAuthRefresh: true }),
    ).rejects.toSatisfy((error: unknown) => toApiError(error).isUnauthorized);

    expect(refreshCalls).toBe(0);
  });

  it("reports a transport failure as a network error", async () => {
    server.use(http.get(`${TEST_API_BASE}/ping`, () => HttpResponse.error()));

    await expect(customFetcher({ url: "/ping", method: "GET" })).rejects.toSatisfy(
      (error: unknown) => toApiError(error).isNetworkError,
    );
  });

  it("does not retry the same request twice when the replay also 401s", async () => {
    let meCalls = 0;
    let refreshCalls = 0;
    server.use(
      http.get(`${TEST_API_BASE}/auth/me`, () => {
        meCalls += 1;
        return HttpResponse.json(
          {
            success: false,
            message: "Could not validate credentials",
            payload: { error_code: "CREDENTIALS_VALIDATION_ERROR", details: {}, status_code: 401 },
          },
          { status: 401 },
        );
      }),
      http.post(`${TEST_API_BASE}/auth/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json({
          success: true,
          message: "Token refreshed successfully",
          payload: { ...accessToken, token: "fresh-token" },
        });
      }),
    );

    setAccessToken("stale-token");
    await expect(customFetcher({ url: "/auth/me", method: "GET" })).rejects.toBeInstanceOf(ApiError);

    expect(meCalls).toBe(2); // original + one replay
    expect(refreshCalls).toBe(1);
  });
});

describe("login + me round trip", () => {
  it("stores the login token and uses it for the identity call", async () => {
    server.use(loginHandler, meHandler);

    const token = await customFetcher<typeof accessToken>({
      url: "/auth/login",
      method: "POST",
      data: { username: "admin", password: "Secret123" },
      skipAuthRefresh: true,
    });
    setAccessToken(token.token);

    const user = await customFetcher<typeof adminUser>({ url: "/auth/me", method: "GET" });

    expect(getAccessToken()).toBe("test-jwt-token");
    expect(user.is_active).toBe(true);
  });
});
