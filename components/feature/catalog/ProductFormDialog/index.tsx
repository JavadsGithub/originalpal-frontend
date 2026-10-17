"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import MediaPickerDialog from "@/components/feature/catalog/MediaPickerDialog/MediaPickerDialog";

export type ProductFormMode = "create" | "edit";

export interface ProductFormValues {
  title: string;
  slug: string;
  category_id: string;
  brand_id: string;
  summary: string;
  description: string;
  /** One per line in the textarea. */
  highlights: string[];
  gallery: string[];
}

export interface ProductOption {
  id: string;
  label: string;
}

export interface ProductFormDialogTranslations {
  createTitle: string;
  editTitle: string;
  createDescription: string;
  editDescription: string;
  titleLabel: string;
  slugLabel: string;
  categoryLabel: string;
  brandLabel: string;
  noBrandOption: string;
  summaryLabel: string;
  descriptionLabel: string;
  highlightsLabel: string;
  highlightsHint: string;
  galleryLabel: string;
  galleryHint: string;
  galleryEmpty: string;
  galleryPickButtonText: string;
  galleryRemoveButtonText: string;
  submitCreate: string;
  submitEdit: string;
  submitting: string;
  cancel: string;
  draftNotice: string;
  noCategoriesNotice: string;
}

export interface ProductFormDialogCallbacks {
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
}

export interface ProductFormDialogUIProps {
  mode: ProductFormMode;
  initialValues?: Partial<ProductFormValues>;
  categories: ProductOption[];
  brands: ProductOption[];
  submitting?: boolean;
  errorMessage?: string | null;
  fieldErrors?: Record<string, string>;
  translations?: Partial<ProductFormDialogTranslations>;
  callbacks: ProductFormDialogCallbacks;
}

const defaultTranslations: ProductFormDialogTranslations = {
  createTitle: "New product",
  editTitle: "Edit product",
  createDescription:
    "Products start as drafts. Publication needs a gallery image, an active SKU and every required category attribute (see the product page).",
  editDescription: "Only the fields you change are sent to the API.",
  titleLabel: "Title",
  slugLabel: "Slug",
  categoryLabel: "Category",
  brandLabel: "Brand",
  noBrandOption: "No brand",
  summaryLabel: "Summary",
  descriptionLabel: "Description",
  highlightsLabel: "Highlights",
  highlightsHint: "One per line; they are shown as bullet points.",
  galleryLabel: "Gallery",
  galleryHint:
    "Uploads are referenced by id and served by the backend — publication needs at least one.",
  galleryEmpty: "No images attached yet.",
  galleryPickButtonText: "Pick from media",
  galleryRemoveButtonText: "Remove",
  submitCreate: "Create product",
  submitEdit: "Save changes",
  submitting: "Saving...",
  cancel: "Cancel",
  draftNotice:
    "The backend refuses to attach an inactive brand (422, field brand_id) — inactive brands are marked.",
  noCategoriesNotice: "Create a category first: products must be filed under one.",
};

/**
 * Tier 1 pure UI for the product form.
 *
 * Products are the centre of the catalog, so the form keeps the two fields that break publication
 * visible: `category_id` (mandatory, gates the required attributes) and `gallery` (mandatory for
 * publishing).
 */
export default function ProductFormDialogUI({
  mode,
  initialValues,
  categories,
  brands,
  submitting = false,
  errorMessage = null,
  fieldErrors = {},
  translations = {},
  callbacks,
}: ProductFormDialogUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const isCreate = mode === "create";

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [categoryId, setCategoryId] = useState(initialValues?.category_id ?? "");
  const [brandId, setBrandId] = useState(initialValues?.brand_id ?? "");
  const [summary, setSummary] = useState(initialValues?.summary ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [highlightsText, setHighlightsText] = useState(
    (initialValues?.highlights ?? []).join("\n"),
  );
  const [gallery, setGallery] = useState<string[]>(initialValues?.gallery ?? []);
  const [isPickerOpen, setPickerOpen] = useState(false);

  const highlights = highlightsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return (
    <>
      <Dialog
        open
        busy={submitting}
        onClose={callbacks.onCancel}
        title={isCreate ? t.createTitle : t.editTitle}
        description={isCreate ? t.createDescription : t.editDescription}
        className="w-[min(44rem,calc(100vw-2rem))]"
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
              form="product-form"
              size="sm"
              disabled={
                submitting ||
                title.trim().length === 0 ||
                slug.trim().length === 0 ||
                categoryId.length === 0
              }
            >
              {submitting ? t.submitting : isCreate ? t.submitCreate : t.submitEdit}
            </Button>
          </>
        }
      >
        <form
          id="product-form"
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            callbacks.onSubmit({
              title: title.trim(),
              slug: slug.trim(),
              category_id: categoryId,
              brand_id: brandId,
              summary: summary.trim(),
              description: description.trim(),
              highlights,
              gallery,
            });
          }}
        >
          <FormError message={errorMessage} />

          {categories.length === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">{t.noCategoriesNotice}</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="product-title">{t.titleLabel}</Label>
              <Input
                id="product-title"
                value={title}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.title)}
                onChange={(event) => setTitle(event.target.value)}
              />
              {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product-slug">{t.slugLabel}</Label>
              <Input
                id="product-slug"
                value={slug}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.slug)}
                onChange={(event) => setSlug(event.target.value)}
              />
              {fieldErrors.slug && <p className="text-xs text-destructive">{fieldErrors.slug}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product-category">{t.categoryLabel}</Label>
              <Select
                id="product-category"
                value={categoryId}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.category_id)}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">—</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </Select>
              {fieldErrors.category_id && (
                <p className="text-xs text-destructive">{fieldErrors.category_id}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="product-brand">{t.brandLabel}</Label>
              <Select
                id="product-brand"
                value={brandId}
                disabled={submitting}
                aria-invalid={Boolean(fieldErrors.brand_id)}
                onChange={(event) => setBrandId(event.target.value)}
              >
                <option value="">{t.noBrandOption}</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">{t.draftNotice}</p>
              {fieldErrors.brand_id && (
                <p className="text-xs text-destructive">{fieldErrors.brand_id}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product-summary">{t.summaryLabel}</Label>
            <Input
              id="product-summary"
              value={summary}
              disabled={submitting}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product-description">{t.descriptionLabel}</Label>
            <Textarea
              id="product-description"
              rows={4}
              value={description}
              disabled={submitting}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product-highlights">{t.highlightsLabel}</Label>
            <Textarea
              id="product-highlights"
              rows={3}
              value={highlightsText}
              disabled={submitting}
              onChange={(event) => setHighlightsText(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t.highlightsHint}</p>
          </div>

          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between">
              <Label>{t.galleryLabel}</Label>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={submitting}
                onClick={() => setPickerOpen(true)}
              >
                {t.galleryPickButtonText}
              </Button>
            </div>

            {gallery.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t.galleryEmpty}</p>
            ) : (
              <ul className="space-y-1">
                {gallery.map((fileId, index) => (
                  <li key={fileId} className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-[0.7rem] text-muted-foreground">
                      {index + 1}. {fileId}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={submitting}
                      onClick={() =>
                        setGallery((current) => current.filter((id) => id !== fileId))
                      }
                    >
                      {t.galleryRemoveButtonText}
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-muted-foreground">{t.galleryHint}</p>
          </div>
        </form>
      </Dialog>

      {isPickerOpen && (
        <MediaPickerDialog
          initialSelection={gallery}
          onConfirm={(ids) => {
            setGallery(ids);
            setPickerOpen(false);
          }}
          onCancel={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}
