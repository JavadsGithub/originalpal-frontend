import { setupServer } from "msw/node";

/**
 * Shared MSW server for the whole test run.
 * Handlers are registered per test via `server.use(...)`.
 */
export const server = setupServer();
