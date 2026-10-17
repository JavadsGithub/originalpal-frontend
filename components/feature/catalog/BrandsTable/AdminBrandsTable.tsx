"use client";

import { useState } from "react";
import useGetBrands from "@/data/feature/catalog/useGetBrands";
import useUpdateBrand from "@/data/feature/catalog/useUpdateBrand";
import useDeleteBrand from "@/data/feature/catalog/useDeleteBrand";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/api";
import type { ApiError } from "@/lib/api-error";
import type { Brand } from "@/lib/types/catalog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/form-error";
import CreateBrandDialog from "@/components/feature/catalog/BrandFormDialog/CreateBrandDialog";
import EditBrandDialog from "@/components/feature/catalog/BrandFormDialog/EditBrandDialog";
import BrandsTableUI, { type BrandRowData } from "./index";
import BrandsTableLoading from "./loading";
import BrandsTableError from "./error";

/**
 * Tier 2 injector for brands.
 *
 * `GET /api/brands/` is public (only `GET /brands/{id}` needs `brands:read`), so the screen itself
 * is open to any signed-in admin; each mutation is gated individually.
 */
export default function AdminBrandsTable({ pageSize = DEFAULT_PAGE_SIZE }: { pageSize?: number }) {
  const { hasPermission, isSuperUser } = useAuth();

  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<
    { kind: "none" } | { kind: "create" } | { kind: "edit"; brand: Brand } | { kind: "delete"; brand: Brand }
  >({ kind: "none" });
  const [busyBrandId, setBusyBrandId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  const { brands, total, page: currentPage, pages, isLoading, isError, error, refetch } = useGetBrands({
    page,
    size: pageSize,
  });
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();

  const canCreate = isSuperUser || hasPermission(Permissions.Brands_Create);
  const canUpdate = isSuperUser || hasPermission(Permissions.Brands_Update);
  const canDelete = isSuperUser || hasPermission(Permissions.Brands_Delete);

  const rows: BrandRowData[] = brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    description: brand.description,
    isActive: brand.is_active,
  }));

  const handleToggleActive = (brandId: string, nextIsActive: boolean) => {
    setActionError(null);
    setBusyBrandId(brandId);

    updateBrand.mutate(
      { brandId, data: { is_active: nextIsActive } },
      { onError: setActionError, onSettled: () => setBusyBrandId(null) },
    );
  };

  const handleDelete = (brand: Brand) => {
    setActionError(null);
    setBusyBrandId(brand.id);

    deleteBrand.mutate(brand.id, {
      onSuccess: () => setDialog({ kind: "none" }),
      onError: setActionError,
      onSettled: () => setBusyBrandId(null),
    });
  };

  if (isLoading) return <BrandsTableLoading />;

  if (isError) {
    return <BrandsTableError message={error?.message ?? "Failed to load brands"} onRetry={refetch} />;
  }

  return (
    <>
      <div className="space-y-3">
        {actionError && <FormError message={actionError.message} data-testid="brands-action-error" />}

        <BrandsTableUI
          brands={rows}
          total={total}
          page={currentPage}
          pages={pages}
          busyBrandId={busyBrandId}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          callbacks={{
            onCreate: () => setDialog({ kind: "create" }),
            onEdit: (brandId) => {
              const brand = brands.find((item) => item.id === brandId);
              if (brand) setDialog({ kind: "edit", brand });
            },
            onToggleActive: handleToggleActive,
            onDelete: (brandId) => {
              const brand = brands.find((item) => item.id === brandId);
              if (brand) setDialog({ kind: "delete", brand });
            },
            onPageChange: setPage,
          }}
        />
      </div>

      {dialog.kind === "create" && <CreateBrandDialog onClose={() => setDialog({ kind: "none" })} />}

      {dialog.kind === "edit" && (
        <EditBrandDialog brand={dialog.brand} onClose={() => setDialog({ kind: "none" })} />
      )}

      {dialog.kind === "delete" && (
        <ConfirmDialog
          open
          destructive
          busy={busyBrandId === dialog.brand.id}
          title={`Delete ${dialog.brand.name}?`}
          description="Products keep their brand_id, so their brand name may stop resolving."
          translations={{ confirmButtonText: "Delete brand" }}
          callbacks={{
            onConfirm: () => handleDelete(dialog.brand),
            onCancel: () => setDialog({ kind: "none" }),
          }}
        />
      )}
    </>
  );
}
