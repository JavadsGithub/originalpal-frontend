"use client";

import { useState } from "react";
import useCreateSku from "@/data/feature/catalog/useCreateSku";
import type { ApiError } from "@/lib/api-error";
import type { Sku } from "@/lib/types/catalog";
import SkuFormDialogUI, { type SkuFormValues } from "./index";

export interface CreateSkuDialogProps {
  productId: string;
  onClose: () => void;
  onCreated?: (sku: Sku) => void;
}

/**
 * Tier 2 injector: `POST /api/products/{productId}/skus/` (requires `skus:create`).
 *
 * A duplicate code or an identical option combination answers `409 CONFLICT`, which is displayed
 * as-is: the backend's notion of "duplicate" includes the option map, so guessing client-side would
 * be wrong.
 */
export default function CreateSkuDialog({ productId, onClose, onCreated }: CreateSkuDialogProps) {
  const [error, setError] = useState<ApiError | null>(null);
  const createSku = useCreateSku();

  const handleSubmit = (values: SkuFormValues) => {
    setError(null);

    createSku.mutate(
      {
        productId,
        data: {
          code: values.code,
          option_values: values.optionValues,
          price_cents: values.priceCents,
          stock_quantity: values.stockQuantity,
        },
      },
      {
        onSuccess: (sku) => {
          onCreated?.(sku);
          onClose();
        },
        onError: setError,
      },
    );
  };

  return (
    <SkuFormDialogUI
      mode="create"
      submitting={createSku.isPending}
      errorMessage={error?.message ?? null}
      fieldErrors={error?.fieldErrors ?? {}}
      initialValues={{ isActive: true, stockQuantity: 0 }}
      callbacks={{ onSubmit: handleSubmit, onCancel: onClose }}
    />
  );
}
