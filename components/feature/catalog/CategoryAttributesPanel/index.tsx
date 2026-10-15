"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  ATTRIBUTE_VALUE_LEVEL_LABELS,
  ATTRIBUTE_VALUE_LEVELS,
  type AttributeValueLevel,
} from "@/lib/types/catalog";

export interface AttributeLinkRow {
  id: string;
  attributeDefinitionId: string;
  title: string;
  valueTypeLabel: string;
  valueLevel: AttributeValueLevel;
  isRequired: boolean;
  displayOrder: number;
  group: string | null;
  /** Declared by an ancestor category — read-only here. */
  inherited: boolean;
  sourceCategoryName: string | null;
}

export interface CategoryAttributesPanelTranslations {
  title: string;
  description: string;
  none: string;
  addLabel: string;
  addButtonText: string;
  levelLabel: string;
  requiredLabel: string;
  orderLabel: string;
  groupLabel: string;
  removeButtonText: string;
  closeButtonText: string;
  inheritedBadge: string;
  requiredBadge: string;
  inheritedHint: string;
  savingLabel: string;
}

export interface CategoryAttributesPanelCallbacks {
  onAdd: (values: {
    attributeDefinitionId: string;
    valueLevel: AttributeValueLevel;
    isRequired: boolean;
    displayOrder: number;
    group: string;
  }) => void;
  onToggleRequired: (linkId: string, nextRequired: boolean) => void;
  onRemove: (linkId: string) => void;
  onClose: () => void;
}

export interface CategoryAttributesPanelUIProps {
  categoryName: string;
  rows: AttributeLinkRow[];
  /** Definitions that are not linked to this category yet. */
  availableDefinitions: Array<{ id: string; label: string }>;
  busyLinkId?: string | null;
  canAssign: boolean;
  canUnassign: boolean;
  canUpdate: boolean;
  errorMessage?: string | null;
  translations?: Partial<CategoryAttributesPanelTranslations>;
  callbacks: CategoryAttributesPanelCallbacks;
}

const defaultTranslations: CategoryAttributesPanelTranslations = {
  title: "Category attributes",
  description:
    "Which attributes products in this category expose. `Required` attributes must be filled in before a product can be published.",
  none: "No attributes linked yet.",
  addLabel: "Attribute",
  addButtonText: "Link attribute",
  levelLabel: "Value level",
  requiredLabel: "Required",
  orderLabel: "Order",
  groupLabel: "Group",
  removeButtonText: "Unlink",
  closeButtonText: "Close",
  inheritedBadge: "inherited",
  requiredBadge: "required",
  inheritedHint: "Inherited from an ancestor category — edit it there.",
  savingLabel: "Saving...",
};

/**
 * Tier 1 pure UI for `GET/POST/PUT/DELETE /api/categories/{id}/attributes/`.
 *
 * Inherited rows come from ancestor categories in the same response; they are shown for context but
 * cannot be edited or unlinked from here (only their `source_category_id` can).
 */
export default function CategoryAttributesPanelUI({
  categoryName,
  rows,
  availableDefinitions,
  busyLinkId = null,
  canAssign,
  canUnassign,
  canUpdate,
  errorMessage = null,
  translations = {},
  callbacks,
}: CategoryAttributesPanelUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const isBusy = busyLinkId !== null;

  return (
    <Dialog
      open
      busy={isBusy}
      onClose={callbacks.onClose}
      title={`${t.title} — ${categoryName}`}
      description={t.description}
      className="w-[min(44rem,calc(100vw-2rem))]"
      footer={
        <Button type="button" variant="outline" size="sm" onClick={callbacks.onClose}>
          {t.closeButtonText}
        </Button>
      }
    >
      <div className="space-y-5" data-testid="category-attributes-panel">
        <FormError message={errorMessage} />

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.none}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                data-testid={`category-attribute-${row.attributeDefinitionId}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-foreground">{row.title}</span>
                    <Badge variant="outline">{row.valueTypeLabel}</Badge>
                    <Badge variant="default">
                      {ATTRIBUTE_VALUE_LEVEL_LABELS[row.valueLevel]}
                    </Badge>
                    {row.isRequired && <Badge variant="warning">{t.requiredBadge}</Badge>}
                    {row.inherited && (
                      <Badge variant="outline" title={t.inheritedHint}>
                        {t.inheritedBadge}
                        {row.sourceCategoryName ? `: ${row.sourceCategoryName}` : ""}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {`${t.orderLabel} ${row.displayOrder}`}
                    {row.group ? ` · ${row.group}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox
                    aria-label={`${row.title} required`}
                    checked={row.isRequired}
                    disabled={isBusy || row.inherited || !canUpdate}
                    onChange={(event) =>
                      callbacks.onToggleRequired(row.id, event.target.checked)
                    }
                  />
                  {canUnassign && !row.inherited && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="xs"
                      disabled={isBusy}
                      onClick={() => callbacks.onRemove(row.id)}
                    >
                      {t.removeButtonText}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {canAssign && (
          <form
            className="space-y-3 rounded-md border border-dashed border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              callbacks.onAdd({
                attributeDefinitionId: String(form.get("attributeDefinitionId") ?? ""),
                valueLevel: String(form.get("valueLevel") ?? "product_or_sku") as AttributeValueLevel,
                isRequired: form.get("isRequired") === "on",
                displayOrder: Number(form.get("displayOrder") ?? 0),
                group: String(form.get("group") ?? ""),
              });
              event.currentTarget.reset();
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="link-attribute">{t.addLabel}</Label>
                <Select id="link-attribute" name="attributeDefinitionId" required disabled={isBusy}>
                  {availableDefinitions.map((definition) => (
                    <option key={definition.id} value={definition.id}>
                      {definition.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="link-level">{t.levelLabel}</Label>
                <Select
                  id="link-level"
                  name="valueLevel"
                  defaultValue="product_or_sku"
                  disabled={isBusy}
                >
                  {ATTRIBUTE_VALUE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {ATTRIBUTE_VALUE_LEVEL_LABELS[level]}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="link-order">{t.orderLabel}</Label>
                <Input
                  id="link-order"
                  name="displayOrder"
                  type="number"
                  min={0}
                  defaultValue={0}
                  disabled={isBusy}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="link-group">{t.groupLabel}</Label>
                <Input id="link-group" name="group" disabled={isBusy} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Checkbox id="link-required" name="isRequired" label={t.requiredLabel} disabled={isBusy} />
              <Button
                type="submit"
                size="sm"
                disabled={isBusy || availableDefinitions.length === 0}
              >
                {isBusy ? t.savingLabel : t.addButtonText}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}
