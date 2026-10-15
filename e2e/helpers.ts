import { expect, type Page } from "@playwright/test";

/**
 * Shared helpers for the end-to-end specs. Credentials come from the backend seed
 * (`app/infra/db/seed.py`); override them with `E2E_USERNAME` / `E2E_PASSWORD`.
 */
export const CREDENTIALS = {
  username: process.env.E2E_USERNAME ?? "admin",
  password: process.env.E2E_PASSWORD ?? "Secret123",
};

/** Signs in through the real form and waits for the redirect into the back office. */
export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(CREDENTIALS.username);
  await page.getByLabel("Password").fill(CREDENTIALS.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Unique-per-run username so repeated runs never collide with leftover rows. */
export function uniqueUsername(prefix = "e2e") {
  return `${prefix}-${Date.now().toString(36)}`;
}
