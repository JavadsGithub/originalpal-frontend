import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { signIn } from "./helpers";

const ADMIN = {
  username: process.env.E2E_USERNAME ?? "admin",
  password: process.env.E2E_PASSWORD ?? "Secret123",
};

const SUFFIX = Date.now().toString(36);
const SLUG = `e2e-orders-${SUFFIX}`;
const SKU_CODE = `${SLUG}-sku`;

/** 1x1 transparent PNG — publishing requires a gallery image (the smoke script uploads the same one). */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AARAAE/wD7uLzAAAAAAElFTkSuQmCC",
  "base64",
);

async function adminHeaders(request: APIRequestContext) {
  const login = await request.post("/api/auth/login", { data: ADMIN });
  expect(login.ok()).toBeTruthy();
  const token = (await login.json()).payload.token;
  return { Authorization: `Bearer ${token}` };
}

/**
 * A published product with one stocked SKU, seeded through the API so the specs never depend on
 * leftover rows. `remove()` undoes everything it created.
 */
async function seedProduct(request: APIRequestContext) {
  const headers = await adminHeaders(request);

  const upload = await request.post("/api/upload", {
    headers,
    multipart: { file: { name: "e2e.png", mimeType: "image/png", buffer: PNG } },
  });
  const fileId = (await upload.json()).payload.id;

  const category = await request.post("/api/categories/", {
    headers,
    data: { name: `E2E orders ${SUFFIX}`, slug: SLUG, parent_id: null },
  });
  const categoryId = (await category.json()).payload.id;

  const product = await request.post("/api/products/", {
    headers,
    data: { title: `E2E order product ${SUFFIX}`, slug: SLUG, category_id: categoryId, brand_id: null },
  });
  const productId = (await product.json()).payload.id;

  // Three gates before publication: a gallery image, an active SKU, valid attribute values.
  await request.put(`/api/products/${productId}`, { headers, data: { gallery: [fileId] } });
  const sku = await request.post(`/api/products/${productId}/skus/`, {
    headers,
    data: { code: SKU_CODE, price_cents: 2599, stock_quantity: 4 },
  });
  const skuId = (await sku.json()).payload.id;
  const publish = await request.post(`/api/products/${productId}/publish`, { headers });
  expect(publish.ok()).toBeTruthy();

  const orders: string[] = [];
  return {
    headers,
    productId,
    skuId,
    orders,
    /** Cancels whatever the spec left live (orders themselves cannot be deleted). */
    async removeOrders() {
      for (const orderId of orders) {
        const read = await request.get(`/api/orders/${orderId}/admin`, { headers });
        if (!read.ok()) continue;
        const order = (await read.json()).payload;
        if (["awaiting_payment", "paid", "processing"].includes(order.status)) {
          await request.post(`/api/orders/${orderId}/cancel`, {
            headers,
            data: { reason: "e2e cleanup" },
          });
        }
      }
    },
    async remove() {
      await this.removeOrders();
      await request.delete(`/api/products/${productId}/skus/${skuId}`, { headers });
      await request.delete(`/api/products/${productId}`, { headers });
      await request.delete(`/api/categories/${categoryId}`, { headers });
      await request.delete(`/api/files/${fileId}`, { headers });
    },
  };
}

/** Fills the checkout form and submits it, returning nothing — the caller asserts the redirect. */
async function checkout(page: Page, values: { email: string; city?: string; method?: string }) {
  await expect(page.getByTestId("checkout-form")).toBeVisible();
  await page.getByTestId("checkout-name").fill("E2E Buyer");
  await page.getByTestId("checkout-email").fill(values.email);
  await page.getByTestId("checkout-city").fill(values.city ?? "Tehran");
  await page.getByTestId("checkout-address").fill("Valiasr 1");
  await page.getByTestId("checkout-postal").fill("1234567890");

  // The delivery table is what the API answers for the city: Tehran has standard and express.
  await expect(page.getByTestId("delivery-options")).toBeVisible();
  if (values.method) await page.getByTestId(`delivery-${values.method}`).check();

  await page.getByRole("button", { name: "Place the order" }).click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/);
}

/**
 * Cart → checkout → payment → fulfilment, driven through the screens.
 *
 * Everything here is already asserted against the API by `scripts/smoke-integration.mjs`; what these
 * specs add is the part only a browser can prove — that the token the client stores is the one the
 * next screen needs, that the rule which decides whether a button is shown matches the status the API
 * reports, and that the back office can take an order from `paid` to `delivered`.
 */
test.describe("cart, checkout and orders", () => {
  test("a guest buys, pays, and cannot cancel once paid", async ({ page, request }) => {
    const seeded = await seedProduct(request);

    try {
      // The product page is where a shopper starts; the cart lives in `localStorage`.
      await page.goto(`/products/${seeded.productId}`);
      await expect(page.getByTestId("add-to-cart")).toBeVisible();
      await page.getByTestId("add-to-cart").getByLabel("Quantity").fill("2");
      await page.getByRole("button", { name: "Add to cart" }).click();
      await expect(page.getByTestId("add-to-cart-added")).toContainText("In the cart");

      await page.goto("/cart");
      // The line is keyed by the SKU's id, not its code — the cart's own identifiers are what the API
      // speaks, and a code is only a label a merchant reads.
      await expect(page.getByTestId(`cart-line-${seeded.skuId}`)).toContainText("2 × €25.99 = €51.98");

      await page.getByRole("button", { name: "Checkout" }).click();
      await expect(page).toHaveURL(/\/checkout$/);
      await checkout(page, { email: `guest-${SUFFIX}@example.com`, method: "express" });

      const orderId = page.url().split("/").pop();
      seeded.orders.push(orderId as string);

      // The order page is readable because the client kept the guest token; the panel says the stock
      // is merely reserved until the payment commits it.
      await expect(page.getByTestId("order-view")).toBeVisible();
      await expect(page.getByTestId("order-status-awaiting_payment")).toBeVisible();
      await expect(page.getByTestId("order-status-hint")).toContainText("reserved");
      await expect(page.getByTestId("order-total")).toHaveText("€61.98");
      await expect(page.getByTestId("order-delivery")).toContainText("express");
      // Nothing to cancel yet other than the order itself, whose reason field is on the panel.
      await expect(page.getByTestId("guest-order-actions")).toContainText("Cancel this order");

      // A decline is not a dead end: the attempt can be retried, the order stays payable.
      await page.getByRole("button", { name: "Start a payment attempt" }).click();
      await page.getByRole("button", { name: "Report failed" }).click();
      await expect(page.getByTestId("payment-attempt-status-failed")).toBeVisible();
      await expect(page.getByTestId("order-status-awaiting_payment")).toBeVisible();

      // A failed attempt cannot be re-verified, so the retry mints a new one.
      await page.getByRole("button", { name: "Start a payment attempt" }).click();
      await page.getByRole("button", { name: "Report succeeded" }).click();
      await expect(page.getByTestId("order-status-paid")).toBeVisible();
      await expect(page.getByTestId("payment-succeeded")).toBeVisible();

      // Owner cancellation exists only for unpaid orders ("Only unpaid orders can be cancelled by
      // their owner") — the button is gone, and the panel says why.
      await expect(page.getByTestId("guest-cancel-unavailable")).toContainText("unpaid order");

      // The back office takes it from there.
      await signIn(page);

      await page.goto("/admin/orders");
      await page.getByTestId("orders-search").fill(SKU_CODE);
      await expect(page.getByTestId("orders-table")).toContainText("€61.98");

      await page.goto(`/admin/orders/${orderId}`);
      await expect(page.getByTestId("order-status-paid")).toBeVisible();
      await page.getByRole("button", { name: "Mark processing" }).click();
      await expect(page.getByTestId("order-status-processing")).toBeVisible();

      await page.getByTestId("order-carrier").fill("E2E Post");
      await page.getByTestId("order-tracking").fill(`TRK-${SUFFIX}`);
      await page.getByRole("button", { name: "Mark shipped" }).click();
      await expect(page.getByTestId("order-status-shipped")).toBeVisible();
      await expect(page.getByTestId("order-messages")).toContainText("dispatch notice");

      await page.getByRole("button", { name: "Mark delivered" }).click();
      await expect(page.getByTestId("order-status-delivered")).toBeVisible();
      // Delivered is terminal: no cancel, and a refund needs a cancelled paid order.
      await expect(page.getByText("No action is available")).toBeVisible();
    } finally {
      await seeded.remove().catch(() => undefined);
    }
  });

  test("a guest cancels an unpaid order, then claims it to an account", async ({ page, request }) => {
    const seeded = await seedProduct(request);
    const email = `claimer-${SUFFIX}@example.com`;

    try {
      // Checkout through the API: this spec is about what happens to the order afterwards.
      const cart = await request.post("/api/carts/", { data: {} });
      const cartId = (await cart.json()).payload.id;
      await request.post(`/api/carts/${cartId}/lines/`, {
        data: { sku_id: seeded.skuId, quantity: 1 },
      });
      const checkoutResponse = await request.post("/api/checkouts/", {
        data: {
          cart_id: cartId,
          contact_name: "E2E Buyer",
          contact_email: email,
          contact_phone: null,
          city: "Tehran",
          address_line1: "Valiasr 1",
          postal_code: "1234567890",
          delivery_method: "standard",
        },
      });
      const order = (await checkoutResponse.json()).payload;
      seeded.orders.push(order.id);

      // The order is public through its token — the URL carries it, which is what a confirmation
      // email would do, and the page reads it from there.
      await page.goto(`/orders/${order.id}?token=${order.guest_access_token}`);
      await expect(page.getByTestId("order-status-awaiting_payment")).toBeVisible();

      // A guest may cancel only while the order is unpaid.
      await page.getByTestId("guest-order-actions").getByLabel("Reason").fill("e2e: changed my mind");
      await page.getByRole("button", { name: "Cancel this order" }).click();
      await expect(page.getByTestId("guest-cancel-success")).toBeVisible();
      await expect(page.getByTestId("order-status-cancelled")).toBeVisible();
      await expect(page.getByTestId("guest-cancel-unavailable")).toBeVisible();

      // Claiming needs an account whose email is the one the order was placed for.
      const register = await request.post("/api/auth/register", {
        data: {
          first_name: "E2E",
          last_name: "Claimer",
          email,
          username: `e2e-claimer-${SUFFIX}`,
          password: "Secret123",
        },
      });
      const claimerId = (await register.json()).payload.id;

      try {
        // The helper waits for the redirect. Navigating away before it lands would drop the session:
        // the access token only lives in memory, so the lookup page would render signed-out.
        await page.goto("/login");
        await page.getByLabel("Username").fill(`e2e-claimer-${SUFFIX}`);
        await page.getByLabel("Password").fill("Secret123");
        await page.getByRole("button", { name: "Sign in" }).click();
        await expect(page).toHaveURL(/\/admin$/);

        await page.goto("/orders/lookup");
        await page.getByTestId("lookup-order-id").fill(order.id);
        await page.getByTestId("lookup-token").fill(order.guest_access_token);
        await page.getByRole("button", { name: "Request to claim" }).click();

        // The backend has no outbound email yet, so the verification token is shown on screen.
        await expect(page.getByTestId("claim-verification")).toBeVisible();
        await page.getByRole("button", { name: "Confirm and add to my orders" }).click();

        // Confirming lands on the order inside the account area — the proof that it is claimed.
        await expect(page).toHaveURL(new RegExp(`/account/orders/${order.id}$`));
        await page.goto("/account/orders");
        await expect(page.getByTestId("my-orders-list")).toContainText("€30.99");

        await page.goto(`/account/orders/${order.id}`);
        await expect(page.getByTestId("order-status-cancelled")).toBeVisible();
        // Cancelled and never paid: nothing to refund, and nothing left to cancel.
        await expect(page.getByTestId("my-order-cancel")).toHaveCount(0);
      } finally {
        await request.delete(`/api/users/${claimerId}`, { headers: seeded.headers });
      }
    } finally {
      await seeded.remove().catch(() => undefined);
    }
  });
});
