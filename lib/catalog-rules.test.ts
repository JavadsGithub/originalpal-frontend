import { describe, expect, it } from "vitest";
import {
  evaluatePublishReadiness,
  requiredAttributeStates,
  validateAttributeDefinition,
} from "./catalog-rules";
import type { CategoryAttribute } from "./types/catalog";

/**
 * These rules are transcriptions of the backend's own validators; the assertions below use the
 * exact messages and `details.field` values observed on the live server (see
 * `docs/integration/contract-audit.md` §10).
 */
describe("evaluatePublishReadiness", () => {
  const readyInput = {
    gallery: ["file-1"],
    activeSkuIds: ["sku-1"],
    requiredAttributes: [],
  };

  it("passes when gallery, SKUs and required attributes are all satisfied", () => {
    expect(evaluatePublishReadiness(readyInput)).toEqual({ canPublish: true, blockers: [] });
  });

  it("reports the gallery gate first with the backend's message", () => {
    const result = evaluatePublishReadiness({ ...readyInput, gallery: [] });

    expect(result.canPublish).toBe(false);
    expect(result.blockers[0]).toEqual({
      code: "gallery",
      field: "gallery",
      message: "Product requires a primary image before publication",
    });
  });

  it("reports the SKU gate when no SKU is active", () => {
    const result = evaluatePublishReadiness({ ...readyInput, activeSkuIds: [] });

    expect(result.blockers.map((blocker) => blocker.field)).toContain("skus");
    expect(result.blockers.find((blocker) => blocker.code === "skus")?.message).toBe(
      "Product requires at least one active SKU before publication",
    );
  });

  it("treats a product-level value as sufficient for product_or_sku", () => {
    const result = evaluatePublishReadiness({
      ...readyInput,
      requiredAttributes: [
        {
          attributeDefinitionId: "attr-1",
          name: "Material",
          valueLevel: "product_or_sku",
          hasProductValue: true,
          skuIdsMissingValue: ["sku-1"],
        },
      ],
    });

    expect(result.canPublish).toBe(true);
  });

  it("blocks product_or_sku when neither the product nor every SKU has a value", () => {
    const result = evaluatePublishReadiness({
      ...readyInput,
      requiredAttributes: [
        {
          attributeDefinitionId: "attr-1",
          name: "Material",
          valueLevel: "product_or_sku",
          hasProductValue: false,
          skuIdsMissingValue: ["sku-1"],
        },
      ],
    });

    expect(result.canPublish).toBe(false);
    expect(result.blockers[0].message).toContain("Required product or SKU attribute value is missing");
  });

  it("blocks a sku-level requirement while any active SKU lacks a value", () => {
    const result = evaluatePublishReadiness({
      ...readyInput,
      activeSkuIds: ["sku-1", "sku-2"],
      requiredAttributes: [
        {
          attributeDefinitionId: "attr-1",
          name: "Colour",
          valueLevel: "sku",
          hasProductValue: true,
          skuIdsMissingValue: ["sku-2"],
        },
      ],
    });

    expect(result.canPublish).toBe(false);
    expect(result.blockers[0].message).toContain("Required SKU attribute value is missing");
  });
});

describe("requiredAttributeStates", () => {
  const link = (overrides: Partial<CategoryAttribute>): CategoryAttribute => ({
    id: "link-1",
    category_id: "cat-1",
    attribute_definition_id: "attr-1",
    is_required: true,
    value_level: "sku",
    display_order: 0,
    group: null,
    created_at: "2026-10-15T17:56:49.141219Z",
    updated_at: "2026-10-15T17:56:49.141219Z",
    ...overrides,
  });

  it("ignores optional links and resolves names from the definition map", () => {
    const states = requiredAttributeStates(
      [link({}), link({ id: "link-2", attribute_definition_id: "attr-2", is_required: false })],
      new Map([["attr-1", { id: "attr-1", name: "Colour" }]]),
      [],
      ["sku-1"],
    );

    expect(states).toHaveLength(1);
    expect(states[0]).toMatchObject({ name: "Colour", valueLevel: "sku", hasProductValue: false });
    expect(states[0].skuIdsMissingValue).toEqual(["sku-1"]);
  });

  it("recognises a product-level value and skips SKUs that already have one", () => {
    const states = requiredAttributeStates(
      [link({ value_level: "product_or_sku" })],
      new Map([["attr-1", { id: "attr-1", name: "Colour" }]]),
      [
        { attribute_definition_id: "attr-1", sku_id: null },
        { attribute_definition_id: "attr-1", sku_id: "sku-1" },
      ],
      ["sku-1", "sku-2"],
    );

    expect(states[0].hasProductValue).toBe(true);
    expect(states[0].skuIdsMissingValue).toEqual(["sku-2"]);
  });
});

describe("validateAttributeDefinition", () => {
  const valid = {
    name: "Colour",
    slug: "colour",
    value_type: "single_choice",
    unit: null as string | null,
    choices: ["red", "blue"],
    is_specification: false,
    is_filterable: false,
    is_variant: true,
    display_order: 0,
  };

  it("accepts a definition the backend accepts", () => {
    expect(validateAttributeDefinition(valid)).toEqual({});
  });

  it("mirrors the live-verified failures field by field", () => {
    expect(
      validateAttributeDefinition({ ...valid, is_variant: false, is_specification: false }),
    ).toEqual({ purpose: "Choose at least one attribute purpose" });

    expect(
      validateAttributeDefinition({ ...valid, slug: "Bad Slug" }),
    ).toEqual({ slug: "Use a readable, hyphen-separated slug" });

    expect(
      validateAttributeDefinition({
        ...valid,
        value_type: "text",
        choices: [],
        is_variant: false,
        is_specification: true,
        is_filterable: true,
      }),
    ).toEqual({ is_filterable: "Text attributes are descriptive only in MVP" });

    expect(
      validateAttributeDefinition({
        ...valid,
        value_type: "number",
        is_specification: true,
        is_variant: false,
        choices: [],
        unit: "kg",
      }),
    ).toEqual({});

    expect(
      validateAttributeDefinition({
        ...valid,
        value_type: "number",
        is_specification: true,
        is_variant: false,
        choices: ["red"],
      }),
    ).toEqual({ choices: "Only choice attributes may define choices" });

    expect(
      validateAttributeDefinition({
        ...valid,
        value_type: "text",
        is_specification: true,
        is_variant: false,
        choices: [],
        unit: "cm",
      }),
    ).toEqual({ unit: "Only number attributes may define a unit" });

    expect(
      validateAttributeDefinition({
        ...valid,
        value_type: "single_choice",
        is_variant: false,
        is_specification: true,
        choices: ["red"],
        display_order: -1,
      }),
    ).toEqual({ display_order: "Display order cannot be negative" });
  });
});
