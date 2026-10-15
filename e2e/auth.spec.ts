import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("authentication against the live backend", () => {
  test("an anonymous visitor is redirected from the back office to /login", async ({ page }) => {
    await page.goto("/admin/users");

    await expect(page).toHaveURL(/\/login(\?|$)/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("the backend rejects wrong credentials and the message reaches the form", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Live-verified copy of the backend's `CREDENTIALS_VALIDATION_ERROR` message.
    await expect(page.getByText(/incorrect username or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test("signing in lands on the back office and shows the identity", async ({ page }) => {
    await signIn(page);

    await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
    await expect(page.getByText("super:user")).toBeVisible();
    await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
  });

  test("a reload restores the session from the HttpOnly refresh cookie", async ({ page }) => {
    await signIn(page);

    // The access token only lives in memory, so this exercises POST /api/auth/refresh.
    await page.reload();

    await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("signing out revokes the session and re-locks the back office", async ({ page }) => {
    await signIn(page);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login(\?|$)/);

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });
});
