"use client";

import useGetCategories from "@/data/feature/catalog/useGetCategories";
import useGetBrands from "@/data/feature/catalog/useGetBrands";
import StorefrontProductGrid from "@/components/feature/storefront/ProductGrid/StorefrontProductGrid";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import StorefrontSearchUI, { type StorefrontSearchFilters } from "./index";

export interface StorefrontSearchProps {
  initialFilters: StorefrontSearchFilters;
  /** Keeps the URL in sync so a result page is linkable and reloadable. */
  syncUrl?: boolean;
}

const EMPTY: StorefrontSearchFilters = { search: "", categoryId: "", brandId: "" };

/**
 * Tier 2 injector for the public search / category browsing screen.
 *
 * Filters live in the URL (`/search?q=&category=&brand=`), which is what makes a listing shareable and
 * what lets `/categories/{id}` reuse the same screen with a different starting state. The term is
 * debounced as the shopper types; the selects apply immediately.
 */
export default function StorefrontSearch({
  initialFilters,
  syncUrl = true,
}: StorefrontSearchProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<StorefrontSearchFilters>(initialFilters);
  const [applied, setApplied] = useState<StorefrontSearchFilters>(initialFilters);

  // Keystrokes are debounced into one request; a select change applies immediately (it arrives
  // through `handleChange`, not through the debounce).
  useEffect(() => {
    if (filters.search === applied.search) return;

    const timer = setTimeout(() => setApplied(filters), 300);
    return () => clearTimeout(timer);
  }, [filters, applied.search]);

  /**
   * One entry point for both kinds of change: the select-driven filters are applied at once, while the
   * typed term only updates `filters` and waits for the debounce above.
   */
  const handleChange = (next: StorefrontSearchFilters) => {
    setFilters(next);
    if (next.search === applied.search) setApplied(next);
  };

  useEffect(() => {
    if (!syncUrl) return;
    const params = new URLSearchParams();
    if (applied.search) params.set("q", applied.search);
    if (applied.categoryId) params.set("category", applied.categoryId);
    if (applied.brandId) params.set("brand", applied.brandId);
    const query = params.toString();
    router.replace(query ? `/search?${query}` : "/search", { scroll: false });
  }, [applied, router, syncUrl]);

  const { categories } = useGetCategories({ page: 1, size: 100 });
  const { brands } = useGetBrands({ page: 1, size: 100 });

  return (
    <div className="space-y-5">
      <StorefrontSearchUI
        filters={filters}
        categories={categories.map((category) => ({ id: category.id, label: category.name }))}
        brands={brands.map((brand) => ({ id: brand.id, label: brand.name }))}
        callbacks={{
          onSubmit: handleChange,
          onReset: () => {
            setFilters(EMPTY);
            setApplied(EMPTY);
          },
        }}
      />

      <StorefrontProductGrid
        search={applied.search || undefined}
        categoryId={applied.categoryId || undefined}
        brandId={applied.brandId || undefined}
      />
    </div>
  );
}
