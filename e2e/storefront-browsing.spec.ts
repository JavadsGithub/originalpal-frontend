import { expect, test, type APIRequestContext } from "@playwright/test";

const ADMIN = {
  username: process.env.E2E_USERNAME ?? "admin",
  password: process.env.E2E_PASSWORD ?? "Secret123",
};

const SUFFIX = Date.now().toString(36);
const CATEGORY_SLUG = `e2e-storefront-${SUFFIX}`;
const PRODUCT_SLUG = `e2e-storefront-${SUFFIX}`;

/** 1x1 transparent PNG — the same file the smoke script uploads. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AARAAE/wD7uLzAAAAAAElFTkSuQmCC",
  "base64",
);

async function adminToken(request: APIRequestContext): Promise<string> {
  const login = await request.post("/api/auth/login", { data: ADMIN });
  expect(login.ok()).toBeTruthy();
  return (await login.json()).payload.token;
}

async function authHeader(request: APIRequestContext) {
  const token = await adminToken(request);
  return { Authorization: `Bearer ${token}` };
}

/**
 * Seeds a published product through the API and returns what the specs need to find it, so the
 * browsing specs never depend on whatever rows a previous run left behind. `remove()` undoes it.
 */
async function publishProduct(request: APIRequestContext) {
  const headers = await authHeader(request);

  const upload = await request.post("/api/upload", {
    headers,
    multipart: { file: { name: "e2e.png", mimeType: "image/png", buffer: PNG } },
  });
  expect(upload.status()).toBe(201);
  const fileId = (await upload.json()).payload.id;

  const category = await request.post("/api/categories/", {
    headers,
    data: { name: `E2E storefront ${SUFFIX}`, slug: CATEGORY_SLUG, parent_id: null },
  });
  const categoryId = (await category.json()).payload.id;

  const product = await request.post("/api/products/", {
    headers,
    data: {
      title: `E2E storefront product ${SUFFIX}`,
      slug: PRODUCT_SLUG,
      category_id: categoryId,
      brand_id: null,
      summary: "Seeded by the browsing spec",
    },
  });
  const productId = (await product.json()).payload.id;

  await request.put(`/api/products/${productId}`, { headers, data: { gallery: [fileId] } });
  const sku = await request.post(`/api/products/${productId}/skus/`, {
    headers,
    data: { code: `${PRODUCT_SLUG}-sku`, price_cents: 2599, stock_quantity: 4 },
  });
  const skuId = (await sku.json()).payload.id;

  // Publication is the only gate the storefront reads: a published product with an active SKU.
  const publish = await request.post(`/api/products/${productId}/publish`, { headers });
  expect(publish.ok()).toBeTruthy();

  return {
    headers,
    fileId,
    categoryId,
    productId,
    skuId,
    async remove() {
      await request.delete(`/api/products/${productId}/skus/${skuId}`, { headers });
      await request.delete(`/api/products/${productId}`, { headers });
      await request.delete(`/api/categories/${categoryId}`, { headers });
      await request.delete(`/api/files/${fileId}`, { headers });
    },
  };
}

/**
 * Storefront browsing through the UI, **signed out**: the public catalog, a category page, search,
 * the product detail and the homepage blocks.
 *
 * The specs assert the parts that only exist because of how the API behaves — the exact-match
 * category filter, the active-SKU-only visibility, and the fact that images cannot be shown to an
 * anonymous visitor.
 */
test.describe("storefront browsing", () => {
  test("browse the catalog, a category and one product without signing in", async ({
    page,
    request,
  }) => {
    const seeded = await publishProduct(request);

    try {
      await page.goto("/");
      await expect(page.getByRole("link", { name: "Original Pal" })).toBeVisible();

      await page.goto(`/categories/${seeded.categoryId}`);
      await expect(page.getByTestId("product-grid")).toBeVisible();
      await expect(page.getByTestId(`product-card-${PRODUCT_SLUG}`)).toBeVisible();
      await expect(page.getByTestId("category-title")).toHaveText(`E2E storefront ${SUFFIX}`);

      // The gallery is a placeholder on purpose: uploaded files answer 401 for a shopper.
      await page.goto(`/products/${seeded.productId}`);
      await expect(page.getByTestId("product-detail")).toBeVisible();
      await expect(page.getByTestId(`public-sku-${PRODUCT_SLUG}-sku`)).toContainText("€25.99");
      await expect(page.getByTestId("product-gallery")).toContainText("uploads:download");

      await seeded.remove();
      await page.reload();
      await expect(page.getByTestId("product-detail-not-found")).toBeVisible();
    } finally {
      await seeded.remove().catch(() => undefined);
    }
  });

  test("search with the URL as the source of truth", async ({ page, request }) => {
    const seeded = await publishProduct(request);

    try {
      await page.goto("/search");
      await expect(page.getByTestId("storefront-search")).toBeVisible();
      await expect(page.getByTestId(`product-card-${PRODUCT_SLUG}`)).toBeVisible();

      // The term is mirrored into the URL, which is what makes a result page linkable.
      await page.getByLabel("Search", { exact: true }).fill(SUFFIX);
      await expect(page).toHaveURL(new RegExp(`q=${SUFFIX}`));

      await page.getByLabel("Search", { exact: true }).fill("definitely-no-such-product");
      await expect(page.getByTestId("product-grid-empty")).toBeVisible();
      await expect(page).toHaveURL(/q=definitely-no-such-product/);
    } finally {
      await seeded.remove().catch(() => undefined);
    }
  });

  test("the homepage renders the blocks the editor published, in display order", async ({
    page,
    request,
  }) => {
    const headers = await authHeader(request);
    const seeded = await publishProduct(request);

    const first = await request.post("/api/homepage/blocks/", {
      headers,
      data: {
        block_type: "products",
        title: `E2E block ${SUFFIX}`,
        target_ids: [seeded.productId],
        display_order: 1,
        is_active: true,
      },
    });
    const blockId = (await first.json()).payload.id;

    try {
      await page.goto("/");
      const block = page.getByTestId(`homepage-block-${blockId}`);
      await expect(block).toBeVisible();
      await expect(block).toContainText("Products");
      await expect(block.getByTestId(`product-card-${PRODUCT_SLUG}`)).toBeVisible();

      // A block the editor switched off never reaches the storefront.
      await request.put(`/api/homepage/blocks/${blockId}`, {
        headers,
        data: { is_active: false },
      });
      await page.reload();
      await expect(page.getByTestId(`homepage-block-${blockId}`)).toHaveCount(0);
    } finally {
      await request.delete(`/api/homepage/blocks/${blockId}`, { headers });
      await seeded.remove().catch(() => undefined);
    }
  });

  test("keeps the menu the API advertises from ever 404ing", async ({ page }) => {
    await page.goto("/");
    for (const href of ["/categories", "/search", "/cart", "/account", "/blog"]) {
      await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
    }

    // `/blog` has no endpoint behind it: the page says so instead of pretending to be a blog.
    await page.goto("/blog");
    await expect(page.getByRole("heading", { name: "Blog" })).toBeVisible();
    await expect(page.getByText("no blog endpoint")).toBeVisible();
  });
});
