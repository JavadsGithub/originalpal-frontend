import { config } from "dotenv";
import { defineConfig } from "orval";

config();

/**
 * orval is an **accelerator**, not the contract layer: the handwritten hooks in `data/feature/**`
 * are what the component framework and the audit rely on, and they keep working in a fresh clone
 * where the git-ignored `lib/api/` has not been generated yet.
 *
 * Known caveat (verified against the live backend): every endpoint's documented response is the
 * `StandardResponse[T]` envelope, so orval types the generated callers as returning the
 * *envelope* — while `customFetcher` unwraps it at runtime and returns `payload` (see
 * `lib/fetcher.ts`). Types therefore describe the wire format rather than the runtime value. If
 * generated hooks ever become the primary layer, add an `output.override.transformer` that strips
 * the envelope from each response schema so the generated types match what the mutator returns.
 */

const openapiUrl = process.env.OPENAPI_JSON_URL;

if (!openapiUrl) {
  throw new Error("OPENAPI_JSON_URL environment variable is required");
}

export default defineConfig({
  "api-v1": {
    input: openapiUrl,
    output: {
      target: "./lib/api/v1/index.ts",
      schemas: "./lib/api/v1/model",
      client: "axios-functions",
      clean: true,
      override: {
        mutator: {
          path: "./lib/fetcher.ts",
          name: "customFetcher",
        },
      },
    },
  },
  "api-v1-hooks": {
    input: openapiUrl,
    output: {
      target: "./lib/api/v1/hooks.ts",
      schemas: "./lib/api/v1/model",
      client: "react-query",
      clean: false,
      override: {
        mutator: {
          path: "./lib/fetcher.ts",
          name: "fetcherHookAdapter",
        },
      },
    },
  },
});
