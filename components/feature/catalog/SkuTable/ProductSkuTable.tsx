"use client";

import { useState } from "react";
import useGetSkus from "@/data/feature/catalog/useGetSkus";
import useDeactivateSku from "@/data/feature/catalog/useDeactivateSku";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import { CURRENCY } from "@/lib/config";
import { formatPriceCents, type Sku } from "@/lib/types/catalog";
import type { ApiError } from "@/lib/api-error";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/form-error";
import CreateSkuDialog from "@/components/feature/catalog/SkuFormDialog/CreateSkuDialog";
import EditSkuDialog from "@/components/feature/catalog/SkuFormDialog/EditSkuDialog";
import AdjustStockDialog from "@/components/feature/catalog/StockAdjustDialog/AdjustStockDialog";
import SkuAttributeValuesDialog from "@/components/feature/catalog/SkuAttributeValuesDialog/SkuAttributeValuesDialog";
import SkuTableUI, { type SkuRowData } from "./index";
import SkuTableError from "./error";

export interface ProductSkuTableProps {
  productId: string;
  /** Needed to know which category's SKU-level attributes apply. */
  categoryId: string;
}

/**
 * Tier 2 injector for one product's SKUs.
 *
 * Permissions: `skus:create` (new), `skus:update` (edit + stock), `skus:delete` (deactivate),
 * `attribute_values:create|update|delete` (SKU-level attribute values).
 */
export default function ProductSkuTable({ productId, categoryId }: ProductSkuTableProps) {
  const { hasPermission, isSuperUser } = useAuth();

  const [dialog, setDialog] = useState<
    | { kind: "none" }
    | { kind: "create" }
    | { kind: "edit"; sku: Sku }
    | { kind: "stock"; sku: Sku }
    | { kind: "attributes"; sku: Sku }
    | { kind: "deactivate"; sku: Sku }
  >({ kind: "none" });
  const [busySkuId, setBusySkuId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  const { skus, total, isError, error, refetch } = useGetSkus({ productId, page: 1, size: 100 });
  const deactivateSku = useDeactivateSku();

  const canCreate = isSuperUser || hasPermission(Permissions.Skus_Create);
  const canUpdate = isSuperUser || hasPermission(Permissions.Skus_Update);
  const canDelete = isSuperUser || hasPermission(Permissions.Skus_Delete);
  const canManageAttributes =
    isSuperUser ||
    hasPermission(Permissions.AttributeValues_Create) ||
    hasPermission(Permissions.AttributeValues_Update);

  const rows: SkuRowData[] = skus.map((sku) => ({
    id: sku.id,
    code: sku.code,
    optionValues: sku.option_values,
    priceLabel: formatPriceCents(sku.price_cents, CURRENCY),
    stockQuantity: sku.stock_quantity,
    reservedQuantity: sku.reserved_quantity,
    availableQuantity: sku.available_quantity,
    imageCount: sku.image_gallery.length,
  }));

  const handleDeactivate = (sku: Sku) => {
    setActionError(null);
    setBusySkuId(sku.id);

    deactivateSku.mutate(
      { productId, skuId: sku.id },
      {
        onSuccess: () => setDialog({ kind: "none" }),
        onError: setActionError,
        onSettled: () => setBusySkuId(null),
      },
    );
  };

  if (isError) {
    return <SkuTableError message={error?.message ?? "Failed to load SKUs"} onRetry={refetch} />;
  }

  return (
    <>
      <div className="space-y-3">
        {actionError && <FormError message={actionError.message} data-testid="skus-action-error" />}

        <SkuTableUI
          skus={rows}
          total={total}
          busySkuId={busySkuId}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canManageAttributes={canManageAttributes}
          callbacks={{
            onCreate: () => setDialog({ kind: "create" }),
            onEdit: (skuId) => {
              const sku = skus.find((item) => item.id === skuId);
              if (sku) setDialog({ kind: "edit", sku });
            },
            onAdjustStock: (skuId) => {
              const sku = skus.find((item) => item.id === skuId);
              if (sku) setDialog({ kind: "stock", sku });
            },
            onManageAttributes: (skuId) => {
              const sku = skus.find((item) => item.id === skuId);
              if (sku) setDialog({ kind: "attributes", sku });
            },
            onDeactivate: (skuId) => {
              const sku = skus.find((item) => item.id === skuId);
              if (sku) setDialog({ kind: "deactivate", sku });
            },
          }}
        />
      </div>

      {dialog.kind === "create" && (
        <CreateSkuDialog productId={productId} onClose={() => setDialog({ kind: "none" })} />
      )}

      {dialog.kind === "edit" && (
        <EditSkuDialog
          productId={productId}
          sku={dialog.sku}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}

      {dialog.kind === "stock" && (
        <AdjustStockDialog
          productId={productId}
          sku={dialog.sku}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}

      {dialog.kind === "attributes" && (
        <SkuAttributeValuesDialog
          productId={productId}
          categoryId={categoryId}
          sku={dialog.sku}
          onClose={() => setDialog({ kind: "none" })}
        />
      )}

      {dialog.kind === "deactivate" && (
        <ConfirmDialog
          open
          destructive
          busy={busySkuId === dialog.sku.id}
          title={`Deactivate ${dialog.sku.code}?`}
          description="The SKU leaves the list and stops counting towards publication. A product without an active SKU cannot be published."
          translations={{ confirmButtonText: "Deactivate SKU" }}
          callbacks={{
            onConfirm: () => handleDeactivate(dialog.sku),
            onCancel: () => setDialog({ kind: "none" }),
          }}
        />
      )}
    </>
  );
}
