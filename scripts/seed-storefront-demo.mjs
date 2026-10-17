#!/usr/bin/env node
/**
 * Seeds a small storefront demo through the same API the UI uses, so the public pages have something
 * to show on a fresh backend.
 *
 * Everything it creates is tagged with the `demo-` slug prefix, so it can be removed again:
 *
 *   node scripts/seed-storefront-demo.mjs            # create/refresh the demo rows
 *   node scripts/seed-storefront-demo.mjs --clean    # delete every `demo-` row
 *
 * Prerequisites: backend up (default http://127.0.0.1:8004) and the frontend dev server running so the
 * `/api/*` proxy answers.
 */

const BASE_URL = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/+$/, "");
const USERNAME = process.env.SMOKE_USERNAME ?? "admin";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "Secret123";
const PREFIX = "demo-";

/**
 * SKU codes are globally unique **and are never freed** — archiving a product or deactivating a variant
 * leaves a hidden row holding the code (backend follow-up #17), so a re-run has to mint new ones.
 */
const RUN = Date.now().toString(36).slice(-4);
const skuCode = (name) => `${PREFIX}${name}-${RUN}`;

const CLEAN = process.argv.includes("--clean");

/** 1x1 transparent PNG — the API only checks the declared content type. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8AARAAE/wD7uLzAAAAAAElFTkSuQmCC",
  "base64",
);

async function request(path, { method = "GET", token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status} ${text.slice(0, 200)}`);
  }
  return json?.payload;
}

async function uploadPng(token, name) {
  const form = new FormData();
  form.append("file", new Blob([PNG], { type: "image/png" }), name);
  const response = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.payload?.id) {
    throw new Error(`POST /api/upload → ${response.status} ${JSON.stringify(json)?.slice(0, 200)}`);
  }
  return json.payload.id;
}

/** Pages through a collection until the predicate finds a row (the demo rows may be past page 1). */
async function findOne(path, predicate, token) {
  for (let page = 1; page <= 10; page += 1) {
    const payload = await request(`${path}${path.includes("?") ? "&" : "?"}page=${page}&size=100`, { token });
    const match = (payload?.items ?? []).find(predicate);
    if (match) return match;
    if (!payload?.items?.length || page >= (payload.pages ?? 1)) return null;
  }
  return null;
}

async function clean(token) {
  let removed = 0;

  for (let page = 1; page <= 10; page += 1) {
    const blocks = await request(`/api/homepage/blocks/?page=${page}&size=100`, { token });
    const demo = (blocks?.items ?? []).filter((block) => block.title.startsWith(PREFIX));
    for (const block of demo) {
      await request(`/api/homepage/blocks/${block.id}`, { method: "DELETE", token });
      removed += 1;
    }
    if (!demo.length) break;
  }

  for (let page = 1; page <= 10; page += 1) {
    const products = await request(`/api/products/?page=${page}&size=100`, { token });
    const demo = (products?.items ?? []).filter((product) => product.slug.startsWith(PREFIX));
    for (const product of demo) {
      const skus = await request(`/api/products/${product.id}/skus/?page=1&size=100`, { token });
      for (const sku of skus?.items ?? []) {
        await request(`/api/products/${product.id}/skus/${sku.id}`, { method: "DELETE", token });
      }
      await request(`/api/products/${product.id}`, { method: "DELETE", token });
      removed += 1;
    }
    if (!demo.length) break;
  }

  for (let page = 1; page <= 10; page += 1) {
    const categories = await request(`/api/categories/?page=${page}&size=100`, { token });
    const demo = (categories?.items ?? []).filter((category) => category.slug.startsWith(PREFIX));
    for (const category of demo) {
      await request(`/api/categories/${category.id}`, { method: "DELETE", token });
      removed += 1;
    }
    if (!demo.length) break;
  }

  for (let page = 1; page <= 10; page += 1) {
    const attributes = await request(`/api/attributes/?page=${page}&size=100`, { token });
    const demo = (attributes?.items ?? []).filter((attribute) => attribute.slug.startsWith(PREFIX));
    for (const attribute of demo) {
      await request(`/api/attributes/${attribute.id}`, { method: "DELETE", token });
      removed += 1;
    }
    if (!demo.length) break;
  }

  const files = await request("/api/files", { token });
  for (const file of files?.items ?? []) {
    if ((file.original_name ?? "").startsWith(PREFIX)) {
      await request(`/api/files/${file.id}`, { method: "DELETE", token });
      removed += 1;
    }
  }

  console.log(`Removed ${removed} demo row(s).`);
}

/**
 * A variant attribute for the knife category.
 *
 * Its SKUs carry the value inline (`option_values: {"demo-size": …}`), because two SKUs on one product
 * cannot share an option combination — `option_signature` is unique per product. The definition is
 * linked as **not** required so publication does not additionally demand attribute-value rows.
 */
const ATTRIBUTE = {
  name: "Demo · Blade length",
  slug: `${PREFIX}size`,
  value_type: "single_choice",
  choices: ["17 cm", "20 cm"],
  is_variant: true,
};

const CATEGORIES = [
  { name: "Demo · Kitchen knives", slug: `${PREFIX}kitchen-knives`, children: [
    { name: "Demo · Santoku", slug: `${PREFIX}santoku` },
    { name: "Demo · Chef knives", slug: `${PREFIX}chef-knives` },
  ] },
  { name: "Demo · Cookware", slug: `${PREFIX}cookware`, children: [] },
];

const PRODUCTS = [
  { title: "Demo · Nakiri knife", slug: `${PREFIX}nakiri`, category: `${PREFIX}santoku`, summary: "Thin-bladed vegetable knife.", highlights: ["Stainless steel", "17 cm blade"], skus: [ { name: "nakiri-17", price: 4599, stock: 6, options: { [`${PREFIX}size`]: "17 cm" } }, { name: "nakiri-20", price: 5299, stock: 2, options: { [`${PREFIX}size`]: "20 cm" } } ] },
  { title: "Demo · Chef knife 20 cm", slug: `${PREFIX}chef-20`, category: `${PREFIX}chef-knives`, summary: "The all-rounder.", highlights: ["Forged bolster"], skus: [ { name: "chef-20", price: 3899, stock: 11 } ] },
  // One SKU at zero stock on purpose: the product stays visible and reads "sold out", which is a
  // different state from a product whose SKUs were all deactivated (that one disappears entirely).
  { title: "Demo · Cast iron pan", slug: `${PREFIX}cast-iron-pan`, category: `${PREFIX}cookware`, summary: "Pre-seasoned, oven safe.", highlights: ["26 cm"], skus: [ { name: "pan-26", price: 3299, stock: 0 } ] },
];

async function seed(token) {
  const categories = new Map();

  for (const category of CATEGORIES) {
    const existingParent = await findOne("/api/categories/", (row) => row.slug === category.slug, token);
    const parent =
      existingParent ??
      (await request("/api/categories/", {
        method: "POST",
        token,
        body: { name: category.name, slug: category.slug, parent_id: null },
      }));
    categories.set(category.slug, parent.id);

    for (const child of category.children) {
      const existingChild = await findOne("/api/categories/", (row) => row.slug === child.slug, token);
      const created =
        existingChild ??
        (await request("/api/categories/", {
          method: "POST",
          token,
          body: { name: child.name, slug: child.slug, parent_id: parent.id },
        }));
      categories.set(child.slug, created.id);
    }
  }

  const attributeSlug = ATTRIBUTE.slug;
  if (!(await findOne("/api/attributes/", (row) => row.slug === attributeSlug, token))) {
    const attribute = await request("/api/attributes/", {
      method: "POST",
      token,
      body: {
        name: ATTRIBUTE.name,
        slug: ATTRIBUTE.slug,
        value_type: ATTRIBUTE.value_type,
        choices: ATTRIBUTE.choices,
        is_variant: true,
      },
    });
    // Not required: the demo should not also need attribute-value rows to publish.
    await request(`/api/categories/${categories.get(`${PREFIX}santoku`)}/attributes/`, {
      method: "POST",
      token,
      body: {
        attribute_definition_id: attribute.id,
        is_required: false,
        value_level: "sku",
        display_order: 0,
      },
    });
  }

  const productIds = [];

  for (const product of PRODUCTS) {
    // A re-run may find a half-seeded product (a failed run above, for example): replace it rather
    // than trying to repair it, so the demo always ends up complete.
    const existing = await findOne("/api/products/", (row) => row.slug === product.slug, token);
    if (existing) {
      const skus = await request(`/api/products/${existing.id}/skus/?page=1&size=100`, { token });
      for (const sku of skus?.items ?? []) {
        await request(`/api/products/${existing.id}/skus/${sku.id}`, { method: "DELETE", token });
      }
      await request(`/api/products/${existing.id}`, { method: "DELETE", token });
    }

    const fileId = await uploadPng(token, `${product.slug}.png`);
    const created = await request("/api/products/", {
      method: "POST",
      token,
      body: {
        title: product.title,
        slug: product.slug,
        category_id: categories.get(product.category),
        brand_id: null,
        summary: product.summary,
        highlights: product.highlights,
      },
    });

    await request(`/api/products/${created.id}`, { method: "PUT", token, body: { gallery: [fileId] } });
    for (const sku of product.skus) {
      await request(`/api/products/${created.id}/skus/`, {
        method: "POST",
        token,
        body: {
          code: skuCode(sku.name),
          price_cents: sku.price,
          stock_quantity: sku.stock,
          option_values: sku.options ?? {},
        },
      });
    }

    // Publication is what makes the product visible to the storefront at all.
    await request(`/api/products/${created.id}/publish`, { method: "POST", token });
    productIds.push(created.id);
  }

  const blocks = [
    {
      block_type: "products",
      title: "Demo · New in the shop",
      subtitle: "Seeded by scripts/seed-storefront-demo.mjs",
      target_url: "/search",
      target_ids: productIds.slice(0, 2),
      display_order: 0,
      is_active: true,
    },
    {
      block_type: "categories",
      title: "Demo · Shop by category",
      target_ids: [...categories.values()].slice(0, 3),
      display_order: 1,
      is_active: true,
    },
  ];

  for (const block of blocks) {
    const existing = await findOne(
      "/api/homepage/blocks/",
      (row) => row.title === block.title,
      token,
    );
    if (existing) {
      await request(`/api/homepage/blocks/${existing.id}`, { method: "PUT", token, body: block });
      continue;
    }
    await request("/api/homepage/blocks/", { method: "POST", token, body: block });
  }

  console.log(
    `Seeded ${categories.size} categories, ${productIds.length} published products and ${blocks.length} homepage blocks.`,
  );
  console.log("Open http://127.0.0.1:3000/ — remove it again with `--clean`.");
}

const login = await request("/api/auth/login", {
  method: "POST",
  body: { username: USERNAME, password: PASSWORD },
});
const token = login?.token;

if (!token) {
  console.error("Could not sign in — check SMOKE_USERNAME / SMOKE_PASSWORD and that the backend is up.");
  process.exit(1);
}

if (CLEAN) await clean(token);
else await seed(token);
