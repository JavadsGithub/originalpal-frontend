"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export interface SearchOption {
  id: string;
  label: string;
}

export interface StorefrontSearchFilters {
  search: string;
  categoryId: string;
  brandId: string;
}

export interface StorefrontSearchTranslations {
  searchLabel: string;
  searchPlaceholder: string;
  categoryLabel: string;
  brandLabel: string;
  allCategories: string;
  allBrands: string;
  submitButtonText: string;
  resetButtonText: string;
  hint: string;
}

export interface StorefrontSearchCallbacks {
  onSubmit: (filters: StorefrontSearchFilters) => void;
  onReset: () => void;
}

export interface StorefrontSearchUIProps {
  filters: StorefrontSearchFilters;
  categories: SearchOption[];
  brands: SearchOption[];
  translations?: Partial<StorefrontSearchTranslations>;
  callbacks: StorefrontSearchCallbacks;
}

const defaultTranslations: StorefrontSearchTranslations = {
  searchLabel: "Search",
  searchPlaceholder: "Product, slug or SKU code",
  categoryLabel: "Category",
  brandLabel: "Brand",
  allCategories: "All categories",
  allBrands: "All brands",
  submitButtonText: "Search",
  resetButtonText: "Reset",
  hint: "The backend matches the term against the title, the slug and the SKU codes.",
};

/**
 * Tier 1 search/filter bar for the public listing.
 *
 * The three inputs are exactly the three filters `GET /api/catalog/products/` accepts. A category is
 * an exact match (no subtree), which the hint on the category page spells out.
 */
export default function StorefrontSearchUI({
  filters,
  categories,
  brands,
  translations = {},
  callbacks,
}: StorefrontSearchUIProps) {
  const t = { ...defaultTranslations, ...translations };

  return (
    <form
      className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[2fr_1fr_1fr_auto]"
      data-testid="storefront-search"
      onSubmit={(event) => {
        event.preventDefault();
        callbacks.onSubmit(filters);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="storefront-search-term">{t.searchLabel}</Label>
        <Input
          id="storefront-search-term"
          value={filters.search}
          placeholder={t.searchPlaceholder}
          onChange={(event) => callbacks.onSubmit({ ...filters, search: event.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="storefront-search-category">{t.categoryLabel}</Label>
        <Select
          id="storefront-search-category"
          value={filters.categoryId}
          onChange={(event) => callbacks.onSubmit({ ...filters, categoryId: event.target.value })}
        >
          <option value="">{t.allCategories}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="storefront-search-brand">{t.brandLabel}</Label>
        <Select
          id="storefront-search-brand"
          value={filters.brandId}
          onChange={(event) => callbacks.onSubmit({ ...filters, brandId: event.target.value })}
        >
          <option value="">{t.allBrands}</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex items-end gap-2">
        <Button type="submit">{t.submitButtonText}</Button>
        <Button type="button" variant="outline" onClick={callbacks.onReset}>
          {t.resetButtonText}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground sm:col-span-4">{t.hint}</p>
    </form>
  );
}
