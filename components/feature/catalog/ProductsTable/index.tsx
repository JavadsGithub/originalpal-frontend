"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PRODUCT_STATUS_LABELS,
  PRODUCT_STATUSES,
  type ProductStatus,
} from "@/lib/types/catalog";

export interface ProductRowData {
  id: string;
  title: string;
  slug: string;
  status: ProductStatus;
  categoryName: string | null;
  brandName: string | null;
  galleryCount: number;
}

export interface ProductFilters {
  search: string;
  status: ProductStatus | "";
  categoryId: string;
  brandId: string;
}

export interface ProductsTableTranslations {
  title: string;
  subtitle: string;
  createButtonText: string;
  searchLabel: string;
  searchPlaceholder: string;
  statusLabel: string;
  categoryLabel: string;
  brandLabel: string;
  anyOption: string;
  applyButtonText: string;
  resetButtonText: string;
  productHeader: string;
  categoryHeader: string;
  brandHeader: string;
  statusHeader: string;
  actionsHeader: string;
  noProductsFound: string;
  editButtonText: string;
  publishButtonText: string;
  unpublishButtonText: string;
  archiveButtonText: string;
  openButtonText: string;
  imagesLabel: string;
  totalLabel: string;
  pageLabel: string;
  ofLabel: string;
  previousButtonText: string;
  nextButtonText: string;
  archivedHint: string;
}

export interface ProductsTableCallbacks {
  onCreate: () => void;
  onFilterChange: (filters: ProductFilters) => void;
  onEdit: (productId: string) => void;
  onPublish: (productId: string) => void;
  onUnpublish: (productId: string) => void;
  onArchive: (productId: string) => void;
  onPageChange: (page: number) => void;
}

export interface ProductsTableUIProps {
  products: ProductRowData[];
  filters: ProductFilters;
  categoryOptions: Array<{ id: string; label: string }>;
  brandOptions: Array<{ id: string; label: string }>;
  total: number;
  page: number;
  pages: number;
  busyProductId?: string | null;
  canCreate: boolean;
  canUpdate: boolean;
  canPublish: boolean;
  canUnpublish: boolean;
  canArchive: boolean;
  translations?: Partial<ProductsTableTranslations>;
  callbacks: ProductsTableCallbacks;
}

const defaultTranslations: ProductsTableTranslations = {
  title: "Products",
  subtitle:
    "Drafts can be edited freely; publishing checks for a gallery image, an active SKU and the required category attributes.",
  createButtonText: "New product",
  searchLabel: "Search",
  searchPlaceholder: "Title or slug",
  statusLabel: "Status",
  categoryLabel: "Category",
  brandLabel: "Brand",
  anyOption: "Any",
  applyButtonText: "Apply",
  resetButtonText: "Reset",
  productHeader: "Product",
  categoryHeader: "Category",
  brandHeader: "Brand",
  statusHeader: "Status",
  actionsHeader: "Actions",
  noProductsFound: "No products match these filters.",
  editButtonText: "Edit",
  publishButtonText: "Publish",
  unpublishButtonText: "Unpublish",
  archiveButtonText: "Archive",
  openButtonText: "Open",
  imagesLabel: "images",
  totalLabel: "total",
  pageLabel: "Page",
  ofLabel: "of",
  previousButtonText: "Previous",
  nextButtonText: "Next",
  archivedHint:
    "Archiving removes the product from every listing and its detail endpoint starts answering 404.",
};

const STATUS_VARIANTS: Record<ProductStatus, "success" | "warning" | "outline"> = {
  published: "success",
  draft: "warning",
  archived: "outline",
};

/**
 * Tier 1 pure UI for the product list: server-side filters, status badges and the three lifecycle
 * actions. Every one of them is a separate permission on the backend, hence three separate flags.
 */
export default function ProductsTableUI({
  products,
  filters,
  categoryOptions,
  brandOptions,
  total,
  page,
  pages,
  busyProductId = null,
  canCreate,
  canUpdate,
  canPublish,
  canUnpublish,
  canArchive,
  translations = {},
  callbacks,
}: ProductsTableUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const hasActions = canUpdate || canPublish || canUnpublish || canArchive;

  return (
    <section className="space-y-4" data-testid="products-table">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground" data-testid="products-total">
            {total} {t.totalLabel}
          </span>
          {canCreate && (
            <Button type="button" size="sm" onClick={callbacks.onCreate}>
              {t.createButtonText}
            </Button>
          )}
        </div>
      </header>

      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          callbacks.onFilterChange({
            search: String(form.get("search") ?? ""),
            status: String(form.get("status") ?? "") as ProductStatus | "",
            categoryId: String(form.get("categoryId") ?? ""),
            brandId: String(form.get("brandId") ?? ""),
          });
        }}
      >
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor="product-search">
            {t.searchLabel}
          </label>
          <Input
            id="product-search"
            name="search"
            defaultValue={filters.search}
            placeholder={t.searchPlaceholder}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor="product-status">
            {t.statusLabel}
          </label>
          <Select id="product-status" name="status" defaultValue={filters.status}>
            <option value="">{t.anyOption}</option>
            {PRODUCT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PRODUCT_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor="product-category-filter">
            {t.categoryLabel}
          </label>
          <Select
            id="product-category-filter"
            name="categoryId"
            defaultValue={filters.categoryId}
          >
            <option value="">{t.anyOption}</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor="product-brand-filter">
            {t.brandLabel}
          </label>
          <Select id="product-brand-filter" name="brandId" defaultValue={filters.brandId}>
            <option value="">{t.anyOption}</option>
            {brandOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <Button type="submit" size="sm">
            {t.applyButtonText}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              callbacks.onFilterChange({ search: "", status: "", categoryId: "", brandId: "" })
            }
          >
            {t.resetButtonText}
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.productHeader}</TableHead>
              <TableHead>{t.categoryHeader}</TableHead>
              <TableHead>{t.brandHeader}</TableHead>
              <TableHead>{t.statusHeader}</TableHead>
              {hasActions && <TableHead className="text-right">{t.actionsHeader}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={hasActions ? 5 : 4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t.noProductsFound}
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const isBusy = busyProductId === product.id;

                return (
                  <TableRow key={product.id} data-testid={`product-row-${product.slug}`}>
                    <TableCell>
                      <Link
                        href={`/admin/catalog/products/${product.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {product.title}
                      </Link>
                      <span className="block font-mono text-xs text-muted-foreground">
                        {product.slug} · {product.galleryCount} {t.imagesLabel}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {product.categoryName ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {product.brandName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[product.status]}>
                        {PRODUCT_STATUS_LABELS[product.status]}
                      </Badge>
                    </TableCell>
                    {hasActions && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              disabled={isBusy}
                              onClick={() => callbacks.onEdit(product.id)}
                            >
                              {t.editButtonText}
                            </Button>
                          )}
                          {product.status !== "published" && canPublish && (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={isBusy}
                              data-testid={`publish-product-${product.slug}`}
                              onClick={() => callbacks.onPublish(product.id)}
                            >
                              {t.publishButtonText}
                            </Button>
                          )}
                          {product.status === "published" && canUnpublish && (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={isBusy}
                              data-testid={`unpublish-product-${product.slug}`}
                              onClick={() => callbacks.onUnpublish(product.id)}
                            >
                              {t.unpublishButtonText}
                            </Button>
                          )}
                          {canArchive && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="xs"
                              disabled={isBusy}
                              title={t.archivedHint}
                              onClick={() => callbacks.onArchive(product.id)}
                            >
                              {t.archiveButtonText}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <nav
          className="flex items-center justify-end gap-3 text-xs text-muted-foreground"
          aria-label="Pagination"
        >
          <span>
            {t.pageLabel} {page} {t.ofLabel} {pages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={page <= 1}
            onClick={() => callbacks.onPageChange(page - 1)}
          >
            {t.previousButtonText}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={page >= pages}
            onClick={() => callbacks.onPageChange(page + 1)}
          >
            {t.nextButtonText}
          </Button>
        </nav>
      )}
    </section>
  );
}
