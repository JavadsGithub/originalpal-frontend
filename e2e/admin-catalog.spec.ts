import { expect, test } from "@playwright/test";
import { signIn, uniqueUsername } from "./helpers";

/**
 * Catalog lifecycle through the UI: category → product → SKU → the backend's publish gates.
 *
 * The interesting assertions are the ones that only a running backend can answer:
 * `POST /api/products/` files the product under a category, `POST …/publish` refuses a gallery-less
 * product with `details.field=gallery`, and the detail page knows that before the click.
 * The run cleans up after itself (archive the product, delete the category).
 */
test.describe("catalog back office", () => {
  test("anonymous visitors cannot open the catalog screens", async ({ page }) => {
    await page.goto("/admin/catalog/products");
    await expect(page).toHaveURL(/\/login/);
  });

  test("create a category, a product and a SKU, then read the publish gates", async ({ page }) => {
    const slug = uniqueUsername("e2e-cat");
    const productTitle = `E2E product ${slug}`;
    const productSlug = `${slug}-product`;

    await signIn(page);

    // 1. Category — POST /api/categories/, then read back from GET /api/categories/.
    await page.goto("/admin/catalog/categories");
    await expect(page.getByTestId("categories-table")).toBeVisible();

    await page.getByRole("button", { name: "New category" }).click();
    await page.getByLabel("Name").fill(`E2E category ${slug}`);
    await page.getByLabel("Slug").fill(slug);
    await page.getByRole("button", { name: "Create category" }).click();

    await expect(page.getByTestId(`category-row-${slug}`)).toBeVisible();

    // 2. Product — products are drafts and must be filed under a category.
    await page.goto("/admin/catalog/products");
    await expect(page.getByTestId("products-table")).toBeVisible();

    await page.getByRole("button", { name: "New product" }).click();
    await page.getByLabel("Title").fill(productTitle);
    await page.getByLabel("Slug").fill(productSlug);
    // Scoped to the dialog: the list behind it has its own "Category" filter select.
    await page
      .getByRole("dialog")
      .getByLabel("Category", { exact: true })
      .selectOption({ label: `E2E category ${slug}` });
    await page.getByRole("button", { name: "Create product" }).click();

    const productRow = page.getByTestId(`product-row-${productSlug}`);
    await expect(productRow).toBeVisible();
    await expect(productRow.getByText("Draft")).toBeVisible();

    // 3. The detail page mirrors the backend's gates 1 and 2 before anything is clicked.
    await productRow.getByRole("link", { name: productTitle }).click();
    await expect(page.getByTestId("publish-checklist")).toBeVisible();
    await expect(page.getByTestId("publish-blocker-gallery")).toBeVisible();
    await expect(page.getByTestId("publish-blocker-skus")).toBeVisible();

    // 4. One active SKU clears the SKU gate (POST …/skus/ with price + opening stock).
    await page.getByRole("button", { name: "New SKU" }).click();
    await page.getByLabel("Code").fill(`${slug}-sku`);
    await page.getByLabel("Price").fill("19.99");
    await page.getByLabel("Initial stock").fill("3");
    await page.getByRole("button", { name: "Create SKU" }).click();

    await expect(page.getByTestId(`sku-row-${slug}-sku`)).toBeVisible();
    await expect(page.getByTestId("publish-blocker-skus")).toHaveCount(0);
    // The gallery gate stays: publishing is still refused, which is the point of the checklist.
    await expect(page.getByTestId("publish-blocker-gallery")).toBeVisible();

    // 5. The list's Publish button hits the real endpoint and surfaces its refusal.
    await page.goto("/admin/catalog/products");
    await page.getByTestId(`publish-product-${productSlug}`).click();
    await expect(page.getByTestId("products-action-error")).toContainText(/gallery|image/i);

    // 6. Archiving removes the product from the API entirely — the row is gone, not moved.
    await page.getByTestId(`product-row-${productSlug}`).getByRole("button", { name: "Archive" }).click();
    await page.getByRole("button", { name: "Archive product" }).click();
    await expect(page.getByTestId(`product-row-${productSlug}`)).toHaveCount(0);

    // 7. Cleanup: the category had no children left once the SKU went with the product.
    await page.goto("/admin/catalog/categories");
    await page.getByTestId(`category-row-${slug}`).getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete category" }).click();
    await expect(page.getByTestId(`category-row-${slug}`)).toHaveCount(0);
  });
});
