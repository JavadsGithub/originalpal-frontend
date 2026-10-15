"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export type CategoryFormMode = "create" | "edit";

export interface CategoryFormValues {
  name: string;
  slug: string;
  /** `""` means "root"; otherwise a parent category id. */
  parentId: string;
}

export interface CategoryParentOption {
  id: string;
  label: string;
}

export interface CategoryFormDialogTranslations {
  createTitle: string;
  editTitle: string;
  description: string;
  nameLabel: string;
  namePlaceholder: string;
  slugLabel: string;
  slugHint: string;
  parentLabel: string;
  rootOption: string;
  submitCreate: string;
  submitEdit: string;
  submitting: string;
  cancel: string;
  deleteNotSupported: string;
}

export interface CategoryFormDialogCallbacks {
  onSubmit: (values: CategoryFormValues) => void;
  onCancel: () => void;
}

export interface CategoryFormDialogUIProps {
  mode: CategoryFormMode;
  initialValues?: Partial<CategoryFormValues>;
  parents: CategoryParentOption[];
  /** Ids that cannot become the parent of this category (itself and its descendants). */
  disabledParentIds?: string[];
  submitting?: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  translations?: Partial<CategoryFormDialogTranslations>;
  callbacks: CategoryFormDialogCallbacks;
}

const defaultTranslations: CategoryFormDialogTranslations = {
  createTitle: "New category",
  editTitle: "Edit category",
  description: "Categories form the tree products are filed under.",
  nameLabel: "Name",
  namePlaceholder: "e.g. Kitchen knives",
  slugLabel: "Slug",
  slugHint: "Lowercase, hyphen-separated — unique per parent and used in storefront URLs.",
  parentLabel: "Parent",
  rootOption: "No parent (root category)",
  submitCreate: "Create category",
  submitEdit: "Save changes",
  submitting: "Saving...",
  cancel: "Cancel",
  deleteNotSupported: "",
};

/** Tier 1 pure UI for create/edit, including the "move to root" case (empty parent). */
export default function CategoryFormDialogUI({
  mode,
  initialValues,
  parents,
  disabledParentIds = [],
  submitting = false,
  errorMessage = null,
  fieldErrors = {},
  translations = {},
  callbacks,
}: CategoryFormDialogUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const isCreate = mode === "create";
  const [name, setName] = useState(initialValues?.name ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [parentId, setParentId] = useState(initialValues?.parentId ?? "");

  return (
    <Dialog
      open
      busy={submitting}
      onClose={callbacks.onCancel}
      title={isCreate ? t.createTitle : t.editTitle}
      description={t.description}
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
          <Button
            type="submit"
            form="category-form"
            size="sm"
            disabled={submitting || name.trim().length === 0 || slug.trim().length === 0}
          >
            {submitting ? t.submitting : isCreate ? t.submitCreate : t.submitEdit}
          </Button>
        </>
      }
    >
      <form
        id="category-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          callbacks.onSubmit({
            name: name.trim(),
            slug: slug.trim(),
            parentId,
          });
        }}
      >
        <FormError message={errorMessage} />

        <div className="space-y-1.5">
          <Label htmlFor="category-name">{t.nameLabel}</Label>
          <Input
            id="category-name"
            value={name}
            placeholder={t.namePlaceholder}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.name)}
            onChange={(event) => setName(event.target.value)}
          />
          {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category-slug">{t.slugLabel}</Label>
          <Input
            id="category-slug"
            value={slug}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.slug)}
            onChange={(event) => setSlug(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t.slugHint}</p>
          {fieldErrors.slug && <p className="text-xs text-destructive">{fieldErrors.slug}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category-parent">{t.parentLabel}</Label>
          <Select
            id="category-parent"
            value={parentId}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.parent_id)}
            onChange={(event) => setParentId(event.target.value)}
          >
            <option value="">{t.rootOption}</option>
            {parents.map((parent) => (
              <option
                key={parent.id}
                value={parent.id}
                disabled={disabledParentIds.includes(parent.id)}
              >
                {parent.label}
              </option>
            ))}
          </Select>
          {fieldErrors.parent_id && (
            <p className="text-xs text-destructive">{fieldErrors.parent_id}</p>
          )}
        </div>
      </form>
    </Dialog>
  );
}
