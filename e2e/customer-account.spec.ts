import { expect, test, type APIRequestContext } from "@playwright/test";
import { uniqueUsername } from "./helpers";

/**
 * Only an administrator may delete an account, so cleanup signs in through the API and removes the
 * account this spec created. (The UI specs above it work with customer tokens, which cannot.)
 */
async function deleteCustomer(request: APIRequestContext, username: string) {
  const login = await request.post("/api/auth/login", {
    data: {
      username: "admin",
      password: process.env.E2E_PASSWORD ?? "Secret123",
    },
  });
  if (!login.ok()) return;

  const token = (await login.json()).payload?.token;
  if (!token) return;

  const users = await request.get("/api/users/?page=1&size=100", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const items = users.ok() ? ((await users.json()).payload?.items ?? []) : [];
  const customer = items.find(
    (user: { username: string }) => user.username === username,
  );

  if (customer) {
    await request.delete(`/api/users/${customer.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

/**
 * Customer-account flows through the UI: register → sign in → profile → address book → recovery.
 *
 * These run without an admin token on purpose — a self-registered account has **zero** permissions,
 * so the specs double as the check that the account screens never depend on one. The customer is
 * deleted through the back office API at the end (only an admin may do that).
 */
test.describe("customer account", () => {
  test("register, sign in, edit the profile and keep an address", async ({
    page,
    request,
  }) => {
    const username = uniqueUsername("e2e-customer");
    const email = `${username}@example.com`;
    const password = "Secret123";

    try {
      // 1. Register — the account is active straight away, but no token is issued.
      await page.goto("/register");
      await page.getByLabel("First name").fill("End");
      await page.getByLabel("Last name").fill("Customer");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Username").fill(username);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Create account" }).click();

      await expect(page).toHaveURL(/\/login\?registered=1/);
      await expect(page.getByTestId("login-notice")).toContainText(
        "Account created",
      );

      // 2. Sign in with the new credentials.
      await page.getByLabel("Username").fill(username);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(/\/admin$/);

      // 3. The account area only needs a session — no permissions involved.
      await page.goto("/account");
      await expect(page.getByTestId("profile-form")).toBeVisible();
      await page.getByLabel("First name").fill("Renamed");
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByTestId("profile-form")).toContainText(
        "Profile updated.",
      );

      // 4. Address book: the first address is forced default by the API.
      await page.goto("/account/addresses");
      await expect(page.getByTestId("address-book")).toBeVisible();
      await page.getByRole("button", { name: "New address" }).click();
      await page.getByLabel("Label").fill("Home");
      await page.getByLabel("Recipient name").fill("End Customer");
      await page.getByLabel("Phone").fill("+15550001");
      await page.getByLabel("Country").fill("US");
      await page.getByLabel("City").fill("Boston");
      await page.getByLabel("Address line").fill("1 Beacon St");
      await page.getByLabel("Postal code").fill("02108");
      await page.getByRole("button", { name: "Add address" }).click();

      await expect(page.getByTestId("address-book")).toContainText("Home");
      await expect(page.getByTestId("address-book")).toContainText("Default");

      // 5. A second address can be promoted, which demotes the first.
      await page.getByRole("button", { name: "New address" }).click();
      await page.getByLabel("Label").fill("Office");
      await page.getByLabel("Recipient name").fill("End Customer");
      await page.getByLabel("Phone").fill("+15550001");
      await page.getByLabel("Country").fill("US");
      await page.getByLabel("City").fill("Cambridge");
      await page.getByLabel("Address line").fill("2 Main St");
      await page.getByLabel("Postal code").fill("02139");
      await page.getByRole("button", { name: "Add address" }).click();

      await expect(page.getByTestId("addresses-total")).toContainText(
        "2 total",
      );
      await page.getByRole("button", { name: "Make default" }).first().click();
      // `exact` matters: "Make default" buttons on the other cards also contain the word.
      await expect(
        page.getByTestId("address-book").getByText("Default", { exact: true }),
      ).toHaveCount(1);
    } finally {
      await deleteCustomer(request, username);
    }
  });

  test("recover a password with the token the API hands back", async ({
    page,
    request,
  }) => {
    const username = uniqueUsername("e2e-recover");
    const email = `${username}@example.com`;

    try {
      // The account is created through the UI: this spec is about the recovery screens that follow.
      await page.goto("/register");
      await page.getByLabel("First name").fill("Reset");
      await page.getByLabel("Last name").fill("Tester");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Username").fill(username);
      await page.getByLabel("Password").fill("Secret123");
      await page.getByRole("button", { name: "Create account" }).click();
      await expect(page).toHaveURL(/\/login\?registered=1/);

      // Request the token and continue with it in one go (the API returns it because there is no email).
      await page.goto("/forgot-password");
      await page.getByLabel("Email").fill(email);
      await page.getByRole("button", { name: "Start recovery" }).click();
      await expect(page.getByTestId("recovery-accepted")).toBeVisible();
      await expect(page.getByTestId("reset-token")).not.toBeEmpty();

      await page.getByRole("button", { name: "Use this token" }).click();
      await expect(page).toHaveURL(/\/reset-password\?token=/);

      await page.getByLabel("New password").fill("NewSecret1");
      await page.getByRole("button", { name: "Set new password" }).click();

      await expect(page).toHaveURL(/\/login\?reset=1/);
      await expect(page.getByTestId("login-notice")).toContainText(
        "Password updated",
      );

      // The new password works — the old one no longer does.
      await page.getByLabel("Username").fill(username);
      await page.getByLabel("Password").fill("Secret123");
      await page.getByRole("button", { name: "Sign in" }).click();
      // Scoped to the form's own alert: the App Router's route announcer also carries `role="alert"`,
      // and it is always empty.
      await expect(page.getByTestId("login-error")).toContainText(/incorrect username or password/i);
    } finally {
      await deleteCustomer(request, username);
    }
  });

  test("anonymous visitors cannot open the account area", async ({ page }) => {
    await page.goto("/account/addresses");
    await expect(page).toHaveURL(/\/login/);
  });
});
