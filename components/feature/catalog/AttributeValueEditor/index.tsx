"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { ATTRIBUTE_VALUE_LEVEL_LABELS, type AttributeValueLevel } from "@/lib/types/catalog";
import AttributeValueField, {
  type AttributeValueDraft,
  type AttributeValueFieldDefinition,
} from "@/components/feature/catalog/AttributeValueField/index";

export interface AttributeValueEditorRow {
  definition: AttributeValueFieldDefinition;
  /** Link metadata, when the attribute comes from the category. */
  valueLevel: AttributeValueLevel | null;
  isRequired: boolean;
  /** Existing value row id, when one is stored already. */
  itemId: string | null;
  draft: AttributeValueDraft;
}

export interface AttributeValueEditorTranslations {
  title: string;
  description: string;
  empty: string;
  saveButtonText: string;
  savingLabel: string;
  deleteButtonText: string;
  closeButtonText: string;
  requiredBadge: string;
  storedBadge: string;
  missingBadge: string;
  levelLabel: string;
}

export interface AttributeValueEditorCallbacks {
  onChange: (definitionId: string, draft: AttributeValueDraft) => void;
  onSave: (definitionId: string) => void;
  onDelete: (definitionId: string, itemId: string) => void;
  onClose: () => void;
}

export interface AttributeValueEditorUIProps {
  title: string;
  description: string;
  rows: AttributeValueEditorRow[];
  busyDefinitionId?: string | null;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  translations?: Partial<AttributeValueEditorTranslations>;
  callbacks: AttributeValueEditorCallbacks;
}

const defaultTranslations: AttributeValueEditorTranslations = {
  title: "Attribute values",
  description:
    "One request per attribute. Values are stored per product or per SKU, exactly as the category link demands.",
  empty: "This category declares no attributes yet.",
  saveButtonText: "Save",
  savingLabel: "Saving...",
  deleteButtonText: "Clear",
  closeButtonText: "Close",
  requiredBadge: "required",
  storedBadge: "stored",
  missingBadge: "missing",
  levelLabel: "Level",
};

/**
 * Tier 1 pure UI shared by the product-level and the SKU-level value editors.
 *
 * Saving is per attribute because the API is: each value is its own
 * `POST`/`PUT /attribute-values/` call, and a required attribute that is missing is exactly what
 * blocks publication.
 */
export default function AttributeValueEditorUI({
  title,
  description,
  rows,
  busyDefinitionId = null,
  canCreate,
  canUpdate,
  canDelete,
  errorMessage = null,
  fieldErrors = {},
  translations = {},
  callbacks,
}: AttributeValueEditorUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const isBusy = busyDefinitionId !== null;

  return (
    <Dialog
      open
      onClose={callbacks.onClose}
      title={title}
      description={description}
      busy={isBusy}
      className="w-[min(40rem,calc(100vw-2rem))]"
      footer={
        <Button type="button" variant="outline" size="sm" onClick={callbacks.onClose}>
          {t.closeButtonText}
        </Button>
      }
    >
      <div className="space-y-4" data-testid="attribute-value-editor">
        <FormError message={errorMessage} />

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const isStored = row.itemId !== null;
              const canSave = isStored ? canUpdate : canCreate;
              const rowBusy = busyDefinitionId === row.definition.id;

              return (
                <li
                  key={row.definition.id}
                  className="space-y-2 rounded-md border border-border px-3 py-3"
                  data-testid={`value-row-${row.definition.slug}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.definition.slug}
                    </span>
                    {row.valueLevel && (
                      <Badge variant="outline">
                        {t.levelLabel}: {ATTRIBUTE_VALUE_LEVEL_LABELS[row.valueLevel]}
                      </Badge>
                    )}
                    {row.isRequired && <Badge variant="warning">{t.requiredBadge}</Badge>}
                    <Badge variant={isStored ? "success" : "default"}>
                      {isStored ? t.storedBadge : t.missingBadge}
                    </Badge>
                  </div>

                  <AttributeValueField
                    definition={{ ...row.definition, isRequired: row.isRequired }}
                    value={row.draft}
                    disabled={isBusy}
                    error={fieldErrors[row.definition.slug] ?? fieldErrors[row.definition.id] ?? null}
                    onChange={(draft) => callbacks.onChange(row.definition.id, draft)}
                  />

                  <div className="flex justify-end gap-1">
                    {canDelete && isStored && row.itemId && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="xs"
                        disabled={isBusy}
                        onClick={() => callbacks.onDelete(row.definition.id, row.itemId as string)}
                      >
                        {t.deleteButtonText}
                      </Button>
                    )}
                    {canSave && (
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={isBusy || rowBusy}
                        data-testid={`save-value-${row.definition.slug}`}
                        onClick={() => callbacks.onSave(row.definition.id)}
                      >
                        {rowBusy ? t.savingLabel : t.saveButtonText}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
