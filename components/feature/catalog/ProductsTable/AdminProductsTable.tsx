"use client";

import { useState } from "react";
import useGetProducts from "@/data/feature/catalog/useGetProducts";
import useGetCategories from "@/data/feature/catalog/useGetCategories";
import useGetBrands from "@/data/feature/catalog/useGetBrands";
import usePublishProduct from "@/data/feature/catalog/usePublishProduct";
import useUnpublishProduct from "@/data/feature/catalog/useUnpublishProduct";
import useArchiveProduct from "@/data/feature/catalog/useArchiveProduct";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/api";
import { toApiError, type ApiError } from "@/lib/api-error";
import type { Product } from "@/lib/types/catalog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/form-error";
import CreateProductDialog from "@/components/feature/catalog/ProductFormDialog/CreateProductDialog";
import EditProductDialog from "@/components/feature/catalog/ProductFormDialog/EditProductDialog";
import ProductsTableUI, { type ProductFilters, type ProductRowData } from "./index";
import ProductsTableLoading from "./loading";
import ProductsTableError from "./error";

const EMPTY_FILTERS: ProductFilters = { search: "", status: "", categoryId: "", brandId: "" };

/**
 * Tier 2 injector for the product list.
 *
 * `GET /api/products/` is public, so browsing needs no permission; every lifecycle action is gated
 * on its own id (`products:create|update|publish|unpublish|delete`).
 *
 * A failed publish is the interesting case: the backend answers `422 VALIDATION_ERROR` whose
 * `details.field` is `gallery`, `skus` or `attribute_values`. The message is shown verbatim next to
 * the link to the product page, where the same rules are displayed as a checklist.
 */
export default function AdminProductsTable({ pageSize = DEFAULT_PAGE_SIZE }: { pageSize?: number }) {
  const { hasPermission, isSuperUser } = useAuth();

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ProductFilters>(EMPTY_FILTERS);
  const [dialog, setDialog] = useState<
    | { kind: "none" }
    | { kind: "create" }
    | { kind: "edit"; product: Product }
    | { kind: "archive"; product: Product }
  >({ kind: "none" });
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  const { categories } = useGetCategories({ page: 1, size: 100 });
  const { brands } = useGetBrands({ page: 1, size: 100 });

  const { products, total, page: currentPage, pages, isLoading, isError, error, refetch } =
    useGetProducts({
      page,
      size: pageSize,
      status: filters.status || undefined,
      categoryId: filters.categoryId || undefined,
      brandId: filters.brandId || undefined,
      search: filters.search || undefined,
    });

  const publishProduct = usePublishProduct();
  const unpublishProduct = useUnpublishProduct();
  const archiveProduct = useArchiveProduct();

  const canCreate = isSuperUser || hasPermission(Permissions.Products_Create);
  const canUpdate = isSuperUser || hasPermission(Permissions.Products_Update);
  const canPublish = isSuperUser || hasPermission(Permissions.Products_Publish);
  const canUnpublish = isSuperUser || hasPermission(Permissions.Products_Unpublish);
  const canArchive = isSuperUser || hasPermission(Permissions.Products_Delete);

  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const brandNames = new Map(brands.map((brand) => [brand.id, brand.name]));

  const rows: ProductRowData[] = products.map((product) => ({
    id: product.id,
    title: product.title,
    slug: product.slug,
    status: product.status,
    categoryName: categoryNames.get(product.category_id) ?? null,
    brandName: product.brand_id ? (brandNames.get(product.brand_id) ?? null) : null,
    galleryCount: product.gallery.length,
  }));

  const handlePublish = (productId: string) => {
    setActionError(null);
    setBusyProductId(productId);

    publishProduct.mutate(
      { productId },
      {
        onError: (mutationError) => setActionError(toApiError(mutationError)),
        onSettled: () => setBusyProductId(null),
      },
    );
  };

  const handleUnpublish = (productId: string) => {
    setActionError(null);
    setBusyProductId(productId);

    unpublishProduct.mutate(
      { productId },
      {
        onError: (mutationError) => setActionError(toApiError(mutationError)),
        onSettled: () => setBusyProductId(null),
      },
    );
  };

  const handleArchive = (product: Product) => {
    setActionError(null);
    setBusyProductId(product.id);

    archiveProduct.mutate(product.id, {
      onSuccess: () => setDialog({ kind: "none" }),
      onError: setActionError,
      onSettled: () => setBusyProductId(null),
    });
  };

  if (isLoading) return <ProductsTableLoading />;

  if (isError) {
    return <ProductsTableError message={error?.message ?? "Failed to load products"} onRetry={refetch} />;
  }

  return (
    <>
      <div className="space-y-3">
        {actionError && (
          <FormError message={actionError.message} data-testid="products-action-error" />
        )}

        <ProductsTableUI
          products={rows}
          filters={filters}
          categoryOptions={categories.map((category) => ({ id: category.id, label: category.name }))}
          brandOptions={brands.map((brand) => ({ id: brand.id, label: brand.name }))}
          total={total}
          page={currentPage}
          pages={pages}
          busyProductId={busyProductId}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canPublish={canPublish}
          canUnpublish={canUnpublish}
          canArchive={canArchive}
          callbacks={{
            onCreate: () => setDialog({ kind: "create" }),
            // Changing the filters changes the result set, so pagination restarts at page 1.
            onFilterChange: (nextFilters) => {
              setFilters(nextFilters);
              setPage(1);
            },
            onEdit: (productId) => {
              const product = products.find((item) => item.id === productId);
              if (product) setDialog({ kind: "edit", product });
            },
            onPublish: handlePublish,
            onUnpublish: handleUnpublish,
            onArchive: (productId) => {
              const product = products.find((item) => item.id === productId);
              if (product) setDialog({ kind: "archive", product });
            },
            onPageChange: setPage,
          }}
        />
      </div>

      {dialog.kind === "create" && <CreateProductDialog onClose={() => setDialog({ kind: "none" })} />}

      {dialog.kind === "edit" && (
        <EditProductDialog product={dialog.product} onClose={() => setDialog({ kind: "none" })} />
      )}

      {dialog.kind === "archive" && (
        <ConfirmDialog
          open
          destructive
          busy={busyProductId === dialog.product.id}
          title={`Archive ${dialog.product.title}?`}
          description="The product disappears from every listing and GET /api/products/{id} answers 404 afterwards. SKUs and values stay in the database."
          translations={{ confirmButtonText: "Archive product" }}
          callbacks={{
            onConfirm: () => handleArchive(dialog.product),
            onCancel: () => setDialog({ kind: "none" }),
          }}
        />
      )}
    </>
  );
}
