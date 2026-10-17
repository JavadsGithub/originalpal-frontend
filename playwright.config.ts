import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end configuration.
 *
 * These specs drive the real stack — Next.js server, `/api/*` proxy route handler, FastAPI backend,
 * Postgres/SQLite data — so they are the only tests that prove the two projects still fit together.
 *
 * Prerequisites (never mocked, otherwise the test proves nothing):
 *   1. the backend running on `API_PROXY_TARGET` (default http://127.0.0.1:8004) with the seed data
 *      (`admin` / `Secret123`, see docs/integration/environment.md);
 *   2. `pnpm exec playwright install chromium` once per machine;
 *   3. the frontend either already running or started by `webServer` below.
 *
 * Environment:
 *   E2E_BASE_URL      frontend origin            (default http://127.0.0.1:3000)
 *   E2E_USERNAME      seeded account             (default admin)
 *   E2E_PASSWORD      seeded password            (default Secret123)
 *   E2E_NO_SERVER=1   do not start a dev server (use when one already runs)
 */
const baseURL = (process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // The defaults (5s to act, 5s to assert, no navigation budget) assume a warm server. These specs
    // run against a freshly started one, and the first request to a route compiles it — so a guard
    // redirect or a sign-in that needs two round-trips can legitimately take longer than five
    // seconds. Being generous here is cheaper than a flaky suite: a genuinely broken assertion still
    // fails, it just takes longer to say so.
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },

  expect: { timeout: 15_000 },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: "pnpm dev",
        url: `${baseURL}/login`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
