import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Unit / integration tests for the client layer.
 *
 * These run without a backend: MSW intercepts HTTP and answers with the *exact* shapes the
 * FastAPI server returns (envelope, FastAPI's `{detail:[...]}` 422, `Set-Cookie`), so the
 * contract is asserted where it is consumed.
 *
 * `pnpm smoke` remains the live end-to-end check against a real backend.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: [
      "lib/**/*.test.{ts,tsx}",
      "data/**/*.test.{ts,tsx}",
      "components/**/*.test.{ts,tsx}",
      "app/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules/**", ".next/**"],
    // The browser client talks to an absolute origin in tests so MSW can intercept it; in the app
    // it defaults to the same-origin `/api` proxy.
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:3000/api",
    },
    clearMocks: true,
    restoreMocks: true,
  },
});
