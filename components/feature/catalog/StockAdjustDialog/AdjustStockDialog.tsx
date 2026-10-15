"use client";

import { useState } from "react";
import useAdjustSkuStock from "@/data/feature/catalog/useAdjustSkuStock";
import useGetSkuStockAdjustments from "@/data/feature/catalog/useGetSkuStockAdjustments";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import type { ApiError } from "@/lib/api-error";
import type { Sku } from "@/lib/types/catalog";
import StockAdjustDialogUI, { type StockAdjustmentRow } from "./index";

export interface AdjustStockDialogProps {
  productId: string;
  sku: Sku;
  onClose: () => void;
}

/**
 * Tier 2 injector for stock adjustments.
 *
 * `POST .../stock-adjustments` needs `skus:update`; the history endpoint needs the same permission,
 * so it is queried only when the caller has it (the dialog says so otherwise).
 */
export default function AdjustStockDialog({ productId, sku, onClose }: AdjustStockDialogProps) {
  const { hasPermission, isSuperUser } = useAuth();
  const [error, setError] = useState<ApiError | null>(null);

  const canReadHistory = isSuperUser || hasPermission(Permissions.Skus_Update);
  const { adjustments: history } = useGetSkuStockAdjustments({
    productId,
    skuId: sku.id,
    page: 1,
    size: 20,
    enabled: canReadHistory,
  });
  const adjustStock = useAdjustSkuStock();

  const rows: StockAdjustmentRow[] = history.map((adjustment) => ({
    id: adjustment.id,
    quantityDelta: adjustment.quantity_delta,
    reason: adjustment.reason,
    stockAfter: adjustment.stock_quantity_after,
    createdAt: adjustment.created_at,
  }));

  return (
    <StockAdjustDialogUI
      skuCode={sku.code}
      currentStock={sku.stock_quantity}
      reservedQuantity={sku.reserved_quantity}
      adjustments={rows}
      submitting={adjustStock.isPending}
      canReadHistory={canReadHistory}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      callbacks={{
        onSubmit: ({ quantityDelta, reason }) => {
          setError(null);

          adjustStock.mutate(
            { productId, skuId: sku.id, data: { quantity_delta: quantityDelta, reason } },
            { onError: setError },
          );
        },
        onCancel: onClose,
      }}
    />
  );
}
