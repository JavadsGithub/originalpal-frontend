import {
  ATTRIBUTE_VALUE_LEVEL_LABELS,
  type AttributeValueLevel,
  type CategoryAttribute,
} from "@/lib/types/catalog";

/**
 * Publish preconditions, transcribed from the live backend.
 *
 * `PublishProductUseCase._validate_publishable` refuses to publish until three things are true, and
 * each failure comes back as `422 VALIDATION_ERROR` with a different `details.field`:
 *
 * | field               | message                                                          |
 * | ------------------- | ---------------------------------------------------------------- |
 * | `gallery`           | Product requires a primary image before publication               |
 * | `skus`              | Product requires at least one active SKU before publication       |
 * | `attribute_values`  | Required product attribute value is missing / Required SKU … / Required product or SKU … |
 *
 * Reproducing the rules here lets the product screen show a checklist *before* the admin clicks
 * Publish, instead of surfacing one opaque 422 at a time. The backend stays authoritative: the
 * messages below are its own, and a failed publish still renders the returned error.
 */

export type PublishBlockerCode = "gallery" | "skus" | "attribute_values";

export interface PublishBlocker {
  code: PublishBlockerCode;
  /** Mirrors the backend's `details.field`. */
  field: string;
  message: string;
}

/** A required attribute of the product's category lineage, with what is already filled in. */
export interface RequiredAttributeState {
  attributeDefinitionId: string;
  name: string;
  valueLevel: AttributeValueLevel;
  /** True when a product-level value exists. */
  hasProductValue: boolean;
  /** Ids of active SKUs that still lack a value (only meaningful for sku-level requirements). */
  skuIdsMissingValue: string[];
}

export interface PublishReadinessInput {
  gallery: string[];
  activeSkuIds: string[];
  requiredAttributes: RequiredAttributeState[];
}

export interface PublishReadiness {
  canPublish: boolean;
  blockers: PublishBlocker[];
}

export function evaluatePublishReadiness({
  gallery,
  activeSkuIds,
  requiredAttributes,
}: PublishReadinessInput): PublishReadiness {
  const blockers: PublishBlocker[] = [];

  if (gallery.length === 0) {
    blockers.push({
      code: "gallery",
      field: "gallery",
      message: "Product requires a primary image before publication",
    });
  }

  if (activeSkuIds.length === 0) {
    blockers.push({
      code: "skus",
      field: "skus",
      message: "Product requires at least one active SKU before publication",
    });
  }

  for (const attribute of requiredAttributes) {
    const satisfied = isSatisfied(attribute, activeSkuIds);
    if (satisfied) continue;

    blockers.push({
      code: "attribute_values",
      field: "attribute_values",
      message: unsatisfiedMessage(attribute),
    });
  }

  return { canPublish: blockers.length === 0, blockers };
}

function isSatisfied(attribute: RequiredAttributeState, activeSkuIds: string[]): boolean {
  if (attribute.valueLevel === "product") return attribute.hasProductValue;
  if (attribute.valueLevel === "sku") {
    return activeSkuIds.every((id) => !attribute.skuIdsMissingValue.includes(id));
  }
  // `product_or_sku`: a single product-level value covers every SKU.
  if (attribute.hasProductValue) return true;
  return activeSkuIds.every((id) => !attribute.skuIdsMissingValue.includes(id));
}

function unsatisfiedMessage(attribute: RequiredAttributeState): string {
  const suffix =
    attribute.valueLevel === "product"
      ? "Required product attribute value is missing"
      : attribute.valueLevel === "sku"
        ? "Required SKU attribute value is missing"
        : "Required product or SKU attribute value is missing";

  return `${suffix} (${attribute.name}, ${ATTRIBUTE_VALUE_LEVEL_LABELS[attribute.valueLevel]})`;
}

/**
 * Maps `GET /api/categories/{id}/attributes/` entries to the required-attribute states used by
 * `evaluatePublishReadiness`, using the values that are already stored for the product.
 */
export function requiredAttributeStates(
  links: CategoryAttribute[],
  definitionsById: Map<string, { id: string; name: string }>,
  values: Array<{ attribute_definition_id: string; sku_id: string | null }>,
  activeSkuIds: string[],
): RequiredAttributeState[] {
  return links
    .filter((link) => link.is_required)
    .map((link) => {
      const definition = definitionsById.get(link.attribute_definition_id);
      const valueCoversLevel = (skuId: string | null) =>
        values.some(
          (value) =>
            value.attribute_definition_id === link.attribute_definition_id &&
            value.sku_id === skuId,
        );

      const hasProductValue = valueCoversLevel(null);
      const skuIdsMissingValue = activeSkuIds.filter((id) => !valueCoversLevel(id));

      return {
        attributeDefinitionId: link.attribute_definition_id,
        name: definition?.name ?? link.attribute_definition_id,
        valueLevel: link.value_level,
        hasProductValue,
        skuIdsMissingValue,
      };
    });
}

/**
 * Client-side mirror of `AttributeDefinitionEntity._normalized`, so the attribute form can block a
 * request that the backend would answer with `422 VALIDATION_ERROR` + `details.field`.
 * Returns `{ field: message }` — the same shape `ApiError.fieldErrors` uses.
 */
export function validateAttributeDefinition(input: {
  name: string;
  slug: string;
  value_type: string;
  unit?: string | null;
  choices: string[];
  is_specification: boolean;
  is_filterable: boolean;
  is_variant: boolean;
  display_order: number;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.name.trim()) {
    errors.name = "Attribute name is required";
  }

  if (!/^[^\W_]+(?:-[^\W_]+)*$/u.test(input.slug)) {
    errors.slug = "Use a readable, hyphen-separated slug";
  }

  if (input.value_type !== "number" && input.unit?.trim()) {
    errors.unit = "Only number attributes may define a unit";
  }

  if (
    input.value_type !== "single_choice" &&
    input.value_type !== "multiple_choice" &&
    input.choices.length > 0
  ) {
    errors.choices = "Only choice attributes may define choices";
  }

  if (
    (input.value_type === "single_choice" || input.value_type === "multiple_choice") &&
    input.choices.some((choice) => !choice.trim())
  ) {
    errors.choices = "Choice attributes require non-empty choices";
  }

  if (input.is_variant && input.value_type !== "single_choice") {
    errors.is_variant = "Variant attributes must be single choice";
  }

  if (input.is_filterable && input.value_type === "text") {
    errors.is_filterable = "Text attributes are descriptive only in MVP";
  }

  if (!input.is_specification && !input.is_filterable && !input.is_variant) {
    errors.purpose = "Choose at least one attribute purpose";
  }

  if (input.display_order < 0) {
    errors.display_order = "Display order cannot be negative";
  }

  return errors;
}
