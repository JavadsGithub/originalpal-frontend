import { expect, test } from "@playwright/test";
import { signIn, uniqueUsername } from "./helpers";

/**
 * Full lifecycle through the UI: create → inactive → activate → assign role → delete.
 *
 * Every step maps to a live endpoint, which is exactly why it belongs in Playwright rather than in
 * a mocked vitest spec: it is the check that the frontend's idea of "user" still matches the
 * backend's.
 */
test.describe("user management", () => {
  test("create, activate, assign a role and delete a user", async ({ page }) => {
    const username = uniqueUsername();
    const email = `${username}@example.com`;

    await signIn(page);
    await page.goto("/admin/users");
    await expect(page.getByTestId("users-table")).toBeVisible();

    // Create — the backend answers with an inactive account on purpose.
    await page.getByRole("button", { name: "New user" }).click();
    await page.getByLabel("First name").fill("End");
    await page.getByLabel("Last name").fill("ToEnd");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill("Secret123");
    await page.getByRole("button", { name: "Create user" }).click();

    const row = page.getByTestId(`user-row-${username}`);
    await expect(row).toBeVisible();
    await expect(row.getByText("Inactive")).toBeVisible();

    // Activate — PUT /api/users/{id} with only `is_active`.
    await page.getByTestId(`toggle-active-${username}`).click();
    await expect(row.getByText("Active")).toBeVisible();

    // Assign the seeded Admin role — POST /api/users/{id}/roles/{roleId}.
    await row.getByRole("button", { name: "Roles" }).click();
    // The checkbox is controlled: it only flips once `POST /users/{id}/roles/{roleId}` answers, so this
    // clicks and then waits for the assignment rather than using `.check()` (which expects the click
    // itself to change the state).
    await page.getByRole("checkbox", { name: "Admin role" }).click();
    await expect(page.getByRole("checkbox", { name: "Admin role" })).toBeChecked();
    await page.getByRole("button", { name: "Close", exact: true }).click();

    // Delete — DELETE /api/users/{id}.
    await row.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete user" }).click();

    await expect(page.getByTestId(`user-row-${username}`)).toHaveCount(0);
  });

  test("the users list paginates with the backend's page payload", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/users");

    await expect(page.getByTestId("users-total")).toContainText(/\d+ total/);
    await expect(page.getByTestId("users-table")).toBeVisible();
  });

  test("roles screen lists the seeded Admin role and its permissions", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/roles");

    const adminRow = page.getByTestId("role-row-Admin");
    await expect(adminRow).toBeVisible();
    await expect(adminRow.getByText("super:user")).toBeVisible();
    await expect(adminRow.getByText("Active")).toBeVisible();
  });
});
