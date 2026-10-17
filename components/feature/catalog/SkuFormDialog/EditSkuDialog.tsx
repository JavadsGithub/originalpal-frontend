"use client";

import { useState } from "react";
import useUpdateSku from "@/data/feature/catalog/useUpdateSku";
import type { ApiError } from "@/lib/api-error";
import type { Sku, SkuUpdateRequest } from "@/lib/types/catalog";
import SkuFormDialogUI, { type SkuFormValues } from "./index";

export interface EditSkuDialogProps {
  productId: string;
  sku: Sku;
  onClose: () => void;
  onSaved?: (sku: Sku) => void;
}

/**
 * Tier 2 injector: `PUT /api/products/{productId}/skus/{skuId}` (requires `skus:update`).
 *
 * Stock is deliberately left out of the diff: raising or lowering it must go through
 * `useAdjustSkuStock`, otherwise the change never reaches the adjustment history.
 */
export default function EditSkuDialog({ productId, sku, onClose, onSaved }: EditSkuDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);
  const updateSku = useUpdateSku();

  const handleSubmit = (values: SkuFormValues) => {
    setError(null);

    const data: SkuUpdateRequest = {};
    if (values.code !== sku.code) data.code = values.code;
    if (JSON.stringify(values.optionValues) !== JSON.stringify(sku.option_values)) {
      data.option_values = values.optionValues;
    }
    if (values.priceCents !== sku.price_cents) data.price_cents = values.priceCents;
    if (values.isActive !== sku.is_active) data.is_active = values.isActive;

    if (Object.keys(data).length === 0) {
      onClose();
      return;
    }

    updateSku.mutate(
      { productId, skuId: sku.id, data },
      {
        onSuccess: (updated) => {
          onSaved?.(updated);
          onClose();
        },
        onError: setError,
      },
    );
  };

  return (
    <SkuFormDialogUI
      mode="edit"
      submitting={updateSku.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      initialValues={{
        code: sku.code,
        optionValues: sku.option_values,
        priceCents: sku.price_cents,
        stockQuantity: sku.stock_quantity,
        isActive: sku.is_active,
      }}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
