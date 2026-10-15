/**
 * Catalog wire types — field-for-field copies of the backend DTOs in
 * `app/interface/dto/{product,sku,category,brand,attribute_definition,attribute_value,category_attribute,upload}_dto.py`.
 *
 * Everything here was verified against the running backend (see
 * `docs/integration/contract-audit.md` §10 for the probe log). Two backend behaviours shape the
 * request types:
 *
 *  1. **Updates are partial.** Omitting a field preserves it; sending an explicit `null` for a
 *     required field is rejected with `422 {"detail":[...]}` ("Omit this field to preserve the
 *     existing value"). Optional fields *can* be cleared with `null` (`brand_id`, `summary`,
 *     `description`, `unit`, `group`, `parent_id`).
 *  2. **`extra="forbid"`** is on most request models, so unknown keys are a 422, not a silent no-op.
 */

// ---------------------------------------------------------------------------
// Enums (mirror the backend's StrEnum members exactly)
// ---------------------------------------------------------------------------

export const PRODUCT_STATUSES = ["draft", "published", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ATTRIBUTE_VALUE_TYPES = [
  "text",
  "number",
  "boolean",
  "single_choice",
  "multiple_choice",
] as const;
export type AttributeValueType = (typeof ATTRIBUTE_VALUE_TYPES)[number];

export const ATTRIBUTE_VALUE_LEVELS = ["product", "sku", "product_or_sku"] as const;
export type AttributeValueLevel = (typeof ATTRIBUTE_VALUE_LEVELS)[number];

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttributeDefinition {
  id: string;
  name: string;
  slug: string;
  value_type: AttributeValueType;
  /** Only number attributes may define a unit. */
  unit: string | null;
  /** Non-empty for `single_choice` / `multiple_choice` only. */
  choices: string[];
  is_specification: boolean;
  is_filterable: boolean;
  is_variant: boolean;
  display_order: number;
  group: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryAttribute {
  id: string;
  category_id: string;
  attribute_definition_id: string;
  is_required: boolean;
  value_level: AttributeValueLevel;
  display_order: number;
  group: string | null;
  created_at: string;
  updated_at: string;
}

/** `GET /api/categories/{id}/attributes/` wraps each link with lineage information. */
export interface CategoryAttributeListEntry {
  item: CategoryAttribute;
  /** True when the link is inherited from an ancestor category instead of declared here. */
  inherited: boolean;
  source_category_id: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  category_id: string;
  brand_id: string | null;
  summary: string | null;
  description: string | null;
  highlights: string[];
  /**
   * Uploaded-file ids, in display order. The backend treats this as free-form `list[str]`; the
   * frontend convention is "id of an item from `GET /api/files`", so the admin UI can render a
   * preview through `/api/files/{id}/download`.
   */
  gallery: string[];
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface Sku {
  id: string;
  product_id: string;
  code: string;
  option_values: Record<string, string>;
  price_cents: number;
  stock_quantity: number;
  /** Held by open carts / orders; computed by the backend. */
  reserved_quantity: number;
  committed_quantity: number;
  available_quantity: number;
  image_gallery: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SkuStockAdjustment {
  id: string;
  sku_id: string;
  /** Non-zero by validation. */
  quantity_delta: number;
  reason: string;
  stock_quantity_after: number;
  created_at: string;
}

export interface SkuStockAdjustmentResult {
  sku: Sku;
  adjustment: SkuStockAdjustment;
}

export interface AttributeValue {
  id: string;
  product_id: string;
  /** Set when the value belongs to a SKU instead of the product itself. */
  sku_id: string | null;
  attribute_definition_id: string;
  /** `str` / `float` / `bool` / `list[str]` depending on the definition's `value_type`. */
  value: unknown;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  /** Storage key (`<uuid4hex><suffix>`) — what actually sits on disk. */
  key: string;
  original_name: string;
  content_type: string | null;
  size: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Requests — categories
// ---------------------------------------------------------------------------

export interface CategoryCreateRequest {
  name: string;
  slug: string;
  parent_id?: string | null;
}

export interface CategoryUpdateRequest {
  name?: string;
  slug?: string;
  /** Explicit `null` moves the category to the root; omitting it preserves the parent. */
  parent_id?: string | null;
}

// ---------------------------------------------------------------------------
// Requests — brands
// ---------------------------------------------------------------------------

export interface BrandCreateRequest {
  name: string;
  slug: string;
  description?: string | null;
  is_active?: boolean;
}

export interface BrandUpdateRequest {
  name?: string;
  slug?: string;
  description?: string | null;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Requests — products
// ---------------------------------------------------------------------------

export interface ProductCreateRequest {
  title: string;
  slug: string;
  category_id: string;
  brand_id?: string | null;
  summary?: string | null;
  description?: string | null;
  highlights?: string[];
  gallery?: string[];
}

export interface ProductUpdateRequest {
  title?: string;
  slug?: string;
  category_id?: string;
  /** Explicit `null` clears the brand (`set_brand` is derived from the field being present). */
  brand_id?: string | null;
  summary?: string | null;
  description?: string | null;
  highlights?: string[];
  gallery?: string[];
}

// ---------------------------------------------------------------------------
// Requests — SKUs
// ---------------------------------------------------------------------------

export interface SkuCreateRequest {
  code: string;
  option_values?: Record<string, string>;
  price_cents: number;
  stock_quantity?: number;
  image_gallery?: string[];
}

export interface SkuUpdateRequest {
  code?: string;
  option_values?: Record<string, string>;
  price_cents?: number;
  stock_quantity?: number;
  image_gallery?: string[];
  is_active?: boolean;
}

export interface SkuStockAdjustRequest {
  /** Must be a non-zero integer; the backend rejects `0` and any move below available stock. */
  quantity_delta: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Requests — attribute definitions, category links, values
// ---------------------------------------------------------------------------

export interface AttributeDefinitionCreateRequest {
  name: string;
  slug: string;
  value_type: AttributeValueType;
  unit?: string | null;
  choices?: string[];
  is_specification?: boolean;
  is_filterable?: boolean;
  is_variant?: boolean;
  display_order?: number;
  group?: string | null;
}

export interface AttributeDefinitionUpdateRequest {
  name?: string;
  slug?: string;
  value_type?: AttributeValueType;
  unit?: string | null;
  choices?: string[];
  is_specification?: boolean;
  is_filterable?: boolean;
  is_variant?: boolean;
  display_order?: number;
  group?: string | null;
}

export interface CategoryAttributeCreateRequest {
  attribute_definition_id: string;
  is_required?: boolean;
  value_level?: AttributeValueLevel;
  display_order?: number;
  group?: string | null;
}

export interface CategoryAttributeUpdateRequest {
  is_required?: boolean;
  value_level?: AttributeValueLevel;
  display_order?: number;
  group?: string | null;
}

export interface AttributeValueCreateRequest {
  attribute_definition_id: string;
  /** Never `null` — the backend rejects a missing value. */
  value: unknown;
}

export interface AttributeValueUpdateRequest {
  value: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export const ATTRIBUTE_VALUE_TYPE_LABELS: Record<AttributeValueType, string> = {
  text: "Text",
  number: "Number",
  boolean: "Yes / no",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
};

export const ATTRIBUTE_VALUE_LEVEL_LABELS: Record<AttributeValueLevel, string> = {
  product: "Product",
  sku: "SKU",
  product_or_sku: "Product or SKU",
};

/** True for the two types whose `choices` list must be non-empty. */
export function isChoiceValueType(valueType: AttributeValueType): boolean {
  return valueType === "single_choice" || valueType === "multiple_choice";
}

/** `129900` → `"1,299.00 EUR"` (currency configurable; see `lib/config.ts`). */
export function formatPriceCents(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** `1.5` → `{ ok: true, cents: 150 }`; rejects anything that is not a positive amount. */
export function parsePriceToCents(input: string): { ok: boolean; cents: number } {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return { ok: false, cents: 0 };

  const cents = Math.round(Number(normalized) * 100);
  return { ok: cents > 0, cents };
}
