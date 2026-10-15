"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { validateAttributeDefinition } from "@/lib/catalog-rules";
import {
  ATTRIBUTE_VALUE_TYPES,
  ATTRIBUTE_VALUE_TYPE_LABELS,
  isChoiceValueType,
  type AttributeValueType,
} from "@/lib/types/catalog";

export type AttributeDefinitionFormMode = "create" | "edit";

export interface AttributeDefinitionFormValues {
  name: string;
  slug: string;
  value_type: AttributeValueType;
  unit: string;
  choices: string[];
  is_specification: boolean;
  is_filterable: boolean;
  is_variant: boolean;
  display_order: number;
  group: string;
}

export interface AttributeDefinitionFormDialogTranslations {
  createTitle: string;
  editTitle: string;
  description: string;
  nameLabel: string;
  slugLabel: string;
  slugHint: string;
  valueTypeLabel: string;
  unitLabel: string;
  unitHint: string;
  choicesLabel: string;
  choicesHint: string;
  displayOrderLabel: string;
  groupLabel: string;
  purposeLabel: string;
  specificationLabel: string;
  filterableLabel: string;
  variantLabel: string;
  purposeHint: string;
  valueTypeChangeWarning: string;
  submitCreate: string;
  submitEdit: string;
  submitting: string;
  cancel: string;
}

export interface AttributeDefinitionFormDialogCallbacks {
  onSubmit: (values: AttributeDefinitionFormValues) => void;
  onCancel: () => void;
}

export interface AttributeDefinitionFormDialogUIProps {
  mode: AttributeDefinitionFormMode;
  initialValues?: Partial<AttributeDefinitionFormValues>;
  submitting?: boolean;
  /** Errors from the backend (`ApiError.fieldErrors`) merged with the local rule check. */
  errorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  translations?: Partial<AttributeDefinitionFormDialogTranslations>;
  callbacks: AttributeDefinitionFormDialogCallbacks;
}

const defaultTranslations: AttributeDefinitionFormDialogTranslations = {
  createTitle: "New attribute",
  editTitle: "Edit attribute",
  description:
    "Attributes are shared definitions; a category decides which of them its products must fill in.",
  nameLabel: "Name",
  slugLabel: "Slug",
  slugHint: "Lowercase, hyphen-separated (letters, digits, single hyphens).",
  valueTypeLabel: "Value type",
  unitLabel: "Unit",
  unitHint: "Only number attributes may carry a unit (e.g. kg, cm).",
  choicesLabel: "Choices",
  choicesHint: "One per line. Required for single/multiple choice attributes, forbidden elsewhere.",
  displayOrderLabel: "Display order",
  groupLabel: "Group",
  purposeLabel: "Purpose",
  specificationLabel: "Specification (shown on the product page)",
  filterableLabel: "Filterable (usable as a storefront filter)",
  variantLabel: "Variant (defines product variants; must be single choice)",
  purposeHint: "The backend requires at least one purpose.",
  valueTypeChangeWarning:
    "Changing the value type reinterprets every value that is already stored for this attribute.",
  submitCreate: "Create attribute",
  submitEdit: "Save changes",
  submitting: "Saving...",
  cancel: "Cancel",
};

/**
 * Tier 1 pure UI for attribute definitions.
 *
 * Local validation mirrors `AttributeDefinitionEntity._normalized` (see
 * `lib/catalog-rules.ts`) so obvious mistakes never leave the browser; whatever the backend still
 * rejects arrives as `fieldErrors` and is rendered under the same field.
 */
export default function AttributeDefinitionFormDialogUI({
  mode,
  initialValues,
  submitting = false,
  errorMessage = null,
  fieldErrors = {},
  translations = {},
  callbacks,
}: AttributeDefinitionFormDialogUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const isCreate = mode === "create";

  const [name, setName] = useState(initialValues?.name ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [valueType, setValueType] = useState<AttributeValueType>(
    initialValues?.value_type ?? "text",
  );
  const [unit, setUnit] = useState(initialValues?.unit ?? "");
  const [choicesText, setChoicesText] = useState((initialValues?.choices ?? []).join("\n"));
  const [isSpecification, setIsSpecification] = useState(initialValues?.is_specification ?? false);
  const [isFilterable, setIsFilterable] = useState(initialValues?.is_filterable ?? false);
  const [isVariant, setIsVariant] = useState(initialValues?.is_variant ?? false);
  const [displayOrder, setDisplayOrder] = useState(initialValues?.display_order ?? 0);
  const [group, setGroup] = useState(initialValues?.group ?? "");
  const [showLocalErrors, setShowLocalErrors] = useState(false);

  const choices = useMemo(
    () =>
      choicesText
        .split("\n")
        .map((choice) => choice.trim())
        .filter((choice) => choice.length > 0),
    [choicesText],
  );

  const localErrors = useMemo(
    () =>
      validateAttributeDefinition({
        name,
        slug,
        value_type: valueType,
        unit,
        choices,
        is_specification: isSpecification,
        is_filterable: isFilterable,
        is_variant: isVariant,
        display_order: displayOrder,
      }),
    [name, slug, valueType, unit, choices, isSpecification, isFilterable, isVariant, displayOrder],
  );

  const errors = useMemo(
    () => ({ ...(showLocalErrors ? localErrors : {}), ...fieldErrors }),
    [showLocalErrors, localErrors, fieldErrors],
  );

  const submit = () => {
    if (Object.keys(localErrors).length > 0) {
      setShowLocalErrors(true);
      return;
    }

    callbacks.onSubmit({
      name: name.trim(),
      slug: slug.trim(),
      value_type: valueType,
      unit: unit.trim(),
      choices,
      is_specification: isSpecification,
      is_filterable: isFilterable,
      is_variant: isVariant,
      display_order: displayOrder,
      group: group.trim(),
    });
  };

  return (
    <Dialog
      open
      busy={submitting}
      onClose={callbacks.onCancel}
      title={isCreate ? t.createTitle : t.editTitle}
      description={t.description}
      className="w-[min(40rem,calc(100vw-2rem))]"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={callbacks.onCancel}
          >
            {t.cancel}
          </Button>
          <Button type="submit" form="attribute-form" size="sm" disabled={submitting}>
            {submitting ? t.submitting : isCreate ? t.submitCreate : t.submitEdit}
          </Button>
        </>
      }
    >
      <form
        id="attribute-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <FormError message={errorMessage} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="attribute-name">{t.nameLabel}</Label>
            <Input
              id="attribute-name"
              value={name}
              disabled={submitting}
              aria-invalid={Boolean(errors.name)}
              onChange={(event) => setName(event.target.value)}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="attribute-slug">{t.slugLabel}</Label>
            <Input
              id="attribute-slug"
              value={slug}
              disabled={submitting}
              aria-invalid={Boolean(errors.slug)}
              onChange={(event) => setSlug(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t.slugHint}</p>
            {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="attribute-value-type">{t.valueTypeLabel}</Label>
            <Select
              id="attribute-value-type"
              value={valueType}
              disabled={submitting}
              onChange={(event) => setValueType(event.target.value as AttributeValueType)}
            >
              {ATTRIBUTE_VALUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {ATTRIBUTE_VALUE_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
            {!isCreate && valueType !== initialValues?.value_type && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t.valueTypeChangeWarning}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="attribute-unit">{t.unitLabel}</Label>
            <Input
              id="attribute-unit"
              value={unit}
              disabled={submitting || valueType !== "number"}
              aria-invalid={Boolean(errors.unit)}
              onChange={(event) => setUnit(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t.unitHint}</p>
            {errors.unit && <p className="text-xs text-destructive">{errors.unit}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="attribute-order">{t.displayOrderLabel}</Label>
            <Input
              id="attribute-order"
              type="number"
              min={0}
              value={displayOrder}
              disabled={submitting}
              aria-invalid={Boolean(errors.display_order)}
              onChange={(event) => setDisplayOrder(Number(event.target.value))}
            />
            {errors.display_order && (
              <p className="text-xs text-destructive">{errors.display_order}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="attribute-group">{t.groupLabel}</Label>
            <Input
              id="attribute-group"
              value={group}
              disabled={submitting}
              onChange={(event) => setGroup(event.target.value)}
            />
          </div>
        </div>

        {isChoiceValueType(valueType) && (
          <div className="space-y-1.5">
            <Label htmlFor="attribute-choices">{t.choicesLabel}</Label>
            <textarea
              id="attribute-choices"
              rows={4}
              value={choicesText}
              disabled={submitting}
              aria-invalid={Boolean(errors.choices)}
              onChange={(event) => setChoicesText(event.target.value)}
              className="flex w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
            />
            <p className="text-xs text-muted-foreground">{t.choicesHint}</p>
            {errors.choices && <p className="text-xs text-destructive">{errors.choices}</p>}
          </div>
        )}

        <fieldset className="space-y-2 rounded-md border border-border p-3">
          <legend className="px-1 text-xs font-semibold text-foreground">{t.purposeLabel}</legend>
          <Checkbox
            id="attribute-specification"
            label={t.specificationLabel}
            checked={isSpecification}
            disabled={submitting}
            onChange={(event) => setIsSpecification(event.target.checked)}
          />
          <Checkbox
            id="attribute-filterable"
            label={t.filterableLabel}
            checked={isFilterable}
            disabled={submitting}
            aria-invalid={Boolean(errors.is_filterable)}
            onChange={(event) => setIsFilterable(event.target.checked)}
          />
          <Checkbox
            id="attribute-variant"
            label={t.variantLabel}
            checked={isVariant}
            disabled={submitting}
            aria-invalid={Boolean(errors.is_variant)}
            onChange={(event) => setIsVariant(event.target.checked)}
          />
          <p className="text-xs text-muted-foreground">{t.purposeHint}</p>
          {(errors.purpose || errors.is_filterable || errors.is_variant) && (
            <p className="text-xs text-destructive">
              {errors.purpose ?? errors.is_filterable ?? errors.is_variant}
            </p>
          )}
        </fieldset>
      </form>
    </Dialog>
  );
}
