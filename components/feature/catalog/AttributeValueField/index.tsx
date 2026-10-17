"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AttributeValueType } from "@/lib/types/catalog";

/** Editing model: every type is edited as text/boolean/array and converted on submit. */
export type AttributeValueDraft = string | string[] | boolean;

export interface AttributeValueFieldDefinition {
  id: string;
  name: string;
  slug: string;
  value_type: AttributeValueType;
  unit: string | null;
  choices: string[];
  /** Rendered next to the label when the backend demands a value for this attribute. */
  isRequired?: boolean;
}

export interface AttributeValueFieldTranslations {
  booleanTrue: string;
  booleanFalse: string;
  chooseOption: string;
  noValue: string;
}

export interface AttributeValueFieldProps {
  definition: AttributeValueFieldDefinition;
  value: AttributeValueDraft;
  disabled?: boolean;
  error?: string | null;
  translations?: Partial<AttributeValueFieldTranslations>;
  onChange: (value: AttributeValueDraft) => void;
}

const defaultTranslations: AttributeValueFieldTranslations = {
  booleanTrue: "Yes",
  booleanFalse: "No",
  chooseOption: "Choose...",
  noValue: "No value",
};

/**
 * Tier 1 input control for one attribute value, chosen by the definition's `value_type`.
 *
 * The backend stores `value` as free-form JSON (`Any`) and validates it against the definition, so
 * the editor is responsible for producing the right JSON type: number attributes submit a number,
 * boolean attributes a boolean, choice attributes a string / list of strings.
 */
export default function AttributeValueField({
  definition,
  value,
  disabled = false,
  error = null,
  translations = {},
  onChange,
}: AttributeValueFieldProps) {
  const t = { ...defaultTranslations, ...translations };
  const inputId = `attribute-value-${definition.slug}`;
  const label = definition.isRequired ? `${definition.name} *` : definition.name;

  const invalid = Boolean(error);

  return (
    <div className="space-y-1.5" data-testid={`attribute-value-${definition.slug}`}>
      <Label htmlFor={inputId}>
        {label}
        {definition.unit ? (
          <span className="pl-1 font-normal text-muted-foreground">({definition.unit})</span>
        ) : null}
      </Label>

      {definition.value_type === "text" && (
        <Input
          id={inputId}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          aria-invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {definition.value_type === "number" && (
        <Input
          id={inputId}
          type="number"
          step="any"
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          aria-invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
        />
      )}

      {definition.value_type === "boolean" && (
        <Select
          id={inputId}
          value={value === true ? "true" : value === false ? "false" : ""}
          disabled={disabled}
          aria-invalid={invalid}
          onChange={(event) =>
            onChange(event.target.value === "" ? "" : event.target.value === "true")
          }
        >
          <option value="">{t.noValue}</option>
          <option value="true">{t.booleanTrue}</option>
          <option value="false">{t.booleanFalse}</option>
        </Select>
      )}

      {definition.value_type === "single_choice" && (
        <Select
          id={inputId}
          value={typeof value === "string" ? value : ""}
          disabled={disabled}
          aria-invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{t.chooseOption}</option>
          {definition.choices.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </Select>
      )}

      {definition.value_type === "multiple_choice" && (
        <div className="flex flex-wrap gap-3" role="group" aria-labelledby={inputId}>
          {definition.choices.map((choice) => {
            const selected = Array.isArray(value) && value.includes(choice);
            return (
              <Checkbox
                key={choice}
                id={`${inputId}-${choice}`}
                label={choice}
                checked={selected}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...(Array.isArray(value) ? value : []), choice]
                      : (Array.isArray(value) ? value : []).filter((item) => item !== choice),
                  )
                }
              />
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Converts an editing draft into the JSON the backend expects.
 * Returns `undefined` for "nothing entered", which callers treat as "no value to send".
 */
export function draftToAttributeValue(
  definition: Pick<AttributeValueFieldDefinition, "value_type">,
  draft: AttributeValueDraft,
): unknown | undefined {
  if (definition.value_type === "boolean") {
    return typeof draft === "boolean" ? draft : undefined;
  }

  if (definition.value_type === "multiple_choice") {
    const list = Array.isArray(draft) ? draft.filter((item) => item.length > 0) : [];
    return list.length > 0 ? list : undefined;
  }

  if (typeof draft !== "string" || draft.trim().length === 0) return undefined;

  if (definition.value_type === "number") {
    const parsed = Number(draft);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return draft.trim();
}

/** Inverse of `draftToAttributeValue`, used to seed the editors from stored values. */
export function attributeValueToDraft(
  definition: Pick<AttributeValueFieldDefinition, "value_type">,
  value: unknown,
): AttributeValueDraft {
  if (definition.value_type === "boolean") return typeof value === "boolean" ? value : "";
  if (definition.value_type === "multiple_choice") {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : String(value);
}
