"use client";

import { useState } from "react";
import useGetSkus from "@/data/feature/catalog/useGetSkus";
import useGetCategoryAttributes from "@/data/feature/catalog/useGetCategoryAttributes";
import useGetAttributeDefinitions from "@/data/feature/catalog/useGetAttributeDefinitions";
import useGetProductAttributeValues from "@/data/feature/catalog/useGetProductAttributeValues";
import usePublishProduct from "@/data/feature/catalog/usePublishProduct";
import useUnpublishProduct from "@/data/feature/catalog/useUnpublishProduct";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import { toApiError, type ApiError } from "@/lib/api-error";
import { evaluatePublishReadiness, requiredAttributeStates } from "@/lib/catalog-rules";
import { ATTRIBUTE_VALUE_LEVEL_LABELS, type Product } from "@/lib/types/catalog";
import { FormError } from "@/components/ui/form-error";
import PublishChecklistUI from "./index";

export interface ProductPublishPanelProps {
  product: Product;
  /** Called when the admin clicks a blocker's "fix" action. */
  onJumpTo: (blockerCode: "gallery" | "skus" | "attribute_values") => void;
}

/**
 * Tier 2 injector for the publish checklist.
 *
 * It loads exactly the data the backend's gates look at — the product's active SKUs, the required
 * attributes along the category lineage (with inherited links included by the API) and the values
 * that exist so far — and evaluates `lib/catalog-rules.ts` against them. Publication itself is still
 * the endpoint's decision; a rejection is rendered verbatim.
 */
export default function ProductPublishPanel({ product, onJumpTo }: ProductPublishPanelProps) {
  const { hasPermission, isSuperUser } = useAuth();
  const [error, setError] = useState<ApiError | null>(null);

  const { skus } = useGetSkus({ productId: product.id, page: 1, size: 100 });
  const { entries } = useGetCategoryAttributes({
    categoryId: product.category_id,
    page: 1,
    size: 100,
  });
  const { definitions } = useGetAttributeDefinitions({ page: 1, size: 100 });
  const { values } = useGetProductAttributeValues({ productId: product.id, page: 1, size: 100 });

  const publishProduct = usePublishProduct();
  const unpublishProduct = useUnpublishProduct();

  const canPublish = isSuperUser || hasPermission(Permissions.Products_Publish);
  const canUnpublish = isSuperUser || hasPermission(Permissions.Products_Unpublish);

  const activeSkuIds = skus.map((sku) => sku.id);

  const states = requiredAttributeStates(
    entries.map((entry) => entry.item),
    new Map(definitions.map((definition) => [definition.id, definition])),
    values.map((value) => ({
      attribute_definition_id: value.attribute_definition_id,
      sku_id: value.sku_id,
    })),
    activeSkuIds,
  );

  const readiness = evaluatePublishReadiness({
    gallery: product.gallery,
    activeSkuIds,
    requiredAttributes: states,
  });

  const handlePublish = () => {
    setError(null);
    publishProduct.mutate({ productId: product.id }, { onError: (mutationError) => setError(toApiError(mutationError)) });
  };

  const handleUnpublish = () => {
    setError(null);
    unpublishProduct.mutate(
      { productId: product.id },
      { onError: (mutationError) => setError(toApiError(mutationError)) },
    );
  };

  return (
    <div className="space-y-2">
      <FormError message={error?.message ?? null} data-testid="publish-error" />

      <PublishChecklistUI
        status={product.status}
        blockers={readiness.blockers}
        requiredAttributes={states.map((state) => ({
          name: state.name,
          levelLabel: ATTRIBUTE_VALUE_LEVEL_LABELS[state.valueLevel],
          satisfied:
            state.valueLevel === "product"
              ? state.hasProductValue
              : state.hasProductValue || state.skuIdsMissingValue.length === 0,
        }))}
        submitting={publishProduct.isPending || unpublishProduct.isPending}
        canPublish={canPublish}
        canUnpublish={canUnpublish}
        callbacks={{ onPublish: handlePublish, onUnpublish: handleUnpublish, onJumpTo }}
      />
    </div>
  );
}
