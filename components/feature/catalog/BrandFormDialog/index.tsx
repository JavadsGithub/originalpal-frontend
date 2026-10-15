"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type BrandFormMode = "create" | "edit";

export interface BrandFormValues {
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
}

export interface BrandFormDialogTranslations {
  createTitle: string;
  editTitle: string;
  description: string;
  nameLabel: string;
  slugLabel: string;
  descriptionLabel: string;
  activeLabel: string;
  inactiveWarning: string;
  submitCreate: string;
  submitEdit: string;
  submitting: string;
  cancel: string;
}

export interface BrandFormDialogCallbacks {
  onSubmit: (values: BrandFormValues) => void;
  onCancel: () => void;
}

export interface BrandFormDialogUIProps {
  mode: BrandFormMode;
  initialValues?: Partial<BrandFormValues>;
  submitting?: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  translations?: Partial<BrandFormDialogTranslations>;
  callbacks: BrandFormDialogCallbacks;
}

const defaultTranslations: BrandFormDialogTranslations = {
  createTitle: "New brand",
  editTitle: "Edit brand",
  description: "Brands are optional: a product can be sold without one.",
  nameLabel: "Name",
  slugLabel: "Slug",
  descriptionLabel: "Description",
  activeLabel: "Active",
  inactiveWarning:
    "Deactivating hides the brand from new product forms — the backend rejects attaching it to a product.",
  submitCreate: "Create brand",
  submitEdit: "Save changes",
  submitting: "Saving...",
  cancel: "Cancel",
};

/** Tier 1 pure UI for creating and editing brands. */
export default function BrandFormDialogUI({
  mode,
  initialValues,
  submitting = false,
  errorMessage = null,
  fieldErrors = {},
  translations = {},
  callbacks,
}: BrandFormDialogUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const isCreate = mode === "create";
  const [name, setName] = useState(initialValues?.name ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [isActive, setIsActive] = useState(initialValues?.is_active ?? true);

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
            form="brand-form"
            size="sm"
            disabled={submitting || name.trim().length === 0 || slug.trim().length === 0}
          >
            {submitting ? t.submitting : isCreate ? t.submitCreate : t.submitEdit}
          </Button>
        </>
      }
    >
      <form
        id="brand-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          callbacks.onSubmit({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim(),
            is_active: isActive,
          });
        }}
      >
        <FormError message={errorMessage} />

        <div className="space-y-1.5">
          <Label htmlFor="brand-name">{t.nameLabel}</Label>
          <Input
            id="brand-name"
            value={name}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.name)}
            onChange={(event) => setName(event.target.value)}
          />
          {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="brand-slug">{t.slugLabel}</Label>
          <Input
            id="brand-slug"
            value={slug}
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.slug)}
            onChange={(event) => setSlug(event.target.value)}
          />
          {fieldErrors.slug && <p className="text-xs text-destructive">{fieldErrors.slug}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="brand-description">{t.descriptionLabel}</Label>
          <Textarea
            id="brand-description"
            rows={3}
            value={description}
            disabled={submitting}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="space-y-1.5 rounded-md border border-border p-3">
          <Checkbox
            id="brand-active"
            label={t.activeLabel}
            checked={isActive}
            disabled={submitting}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          {!isActive && <p className="text-xs text-muted-foreground">{t.inactiveWarning}</p>}
        </div>
      </form>
    </Dialog>
  );
}
