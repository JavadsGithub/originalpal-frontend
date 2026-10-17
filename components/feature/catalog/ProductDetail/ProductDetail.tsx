"use client";

import { useState } from "react";
import useGetProduct from "@/data/feature/catalog/useGetProduct";
import useGetCategories from "@/data/feature/catalog/useGetCategories";
import useGetBrands from "@/data/feature/catalog/useGetBrands";
import { useAuth } from "@/components/layout/auth-provider";
import { Permissions } from "@/lib/permissions";
import { fileDownloadUrl } from "@/lib/catalog-media";
import { PRODUCT_STATUS_LABELS } from "@/lib/types/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EditProductDialog from "@/components/feature/catalog/ProductFormDialog/EditProductDialog";
import ProductPublishPanel from "@/components/feature/catalog/PublishChecklist/ProductPublishPanel";
import ProductAttributeValuesPanel from "@/components/feature/catalog/ProductAttributeValuesPanel/ProductAttributeValuesPanel";
import ProductSkuTable from "@/components/feature/catalog/SkuTable/ProductSkuTable";
import ProductDetailLoading from "./loading";
import ProductDetailError from "./error";
import ProductDetailNotFound from "./not-found";

export interface ProductDetailProps {
  productId: string;
}

/**
 * Tier 2 injector for one product.
 *
 * Composes the three things that decide whether a product can go live — the publish checklist, its
 * SKUs and its attribute values — plus the edit dialog. A 404 here means the product was archived
 * (`DELETE /api/products/{id}` removes it from the API entirely), which is shown as its own state.
 */
export default function ProductDetail({ productId }: ProductDetailProps) {
  const { hasPermission, isSuperUser } = useAuth();

  const [dialog, setDialog] = useState<
    { kind: "none" } | { kind: "edit" } | { kind: "values" }
  >({ kind: "none" });

  const { product, isLoading, isError, error, refetch } = useGetProduct(productId);
  const { categories } = useGetCategories({ page: 1, size: 100 });
  const { brands } = useGetBrands({ page: 1, size: 100 });

  const canUpdate = isSuperUser || hasPermission(Permissions.Products_Update);
  const canManageValues =
    isSuperUser ||
    hasPermission(Permissions.AttributeValues_Create) ||
    hasPermission(Permissions.AttributeValues_Update);

  if (isLoading) return <ProductDetailLoading />;

  if (isError) {
    if (error?.isNotFound) return <ProductDetailNotFound productId={productId} />;

    return (
      <ProductDetailError
        message={error?.message ?? "Failed to load the product"}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!product) return <ProductDetailNotFound productId={productId} />;

  const categoryName = categories.find((category) => category.id === product.category_id)?.name;
  const brandName = product.brand_id
    ? brands.find((brand) => brand.id === product.brand_id)?.name
    : null;

  return (
    <>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{product.title}</h1>
          <Badge
            variant={
              product.status === "published"
                ? "success"
                : product.status === "draft"
                  ? "warning"
                  : "outline"
            }
          >
            {PRODUCT_STATUS_LABELS[product.status]}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">{product.slug}</span>
        </div>

        <p className="text-xs text-muted-foreground">
          {categoryName ?? product.category_id}
          {brandName ? ` · ${brandName}` : ""}
        </p>

        <div className="flex flex-wrap gap-2">
          {canUpdate && (
            <Button type="button" variant="outline" size="sm" onClick={() => setDialog({ kind: "edit" })}>
              Edit product
            </Button>
          )}
          {canManageValues && (
            <Button type="button" variant="outline" size="sm" onClick={() => setDialog({ kind: "values" })}>
              Attribute values
            </Button>
          )}
        </div>
      </header>

      <ProductPublishPanel
        product={product}
        onJumpTo={(blockerCode) => {
          if (blockerCode === "gallery") setDialog({ kind: "edit" });
          else if (blockerCode === "attribute_values") setDialog({ kind: "values" });
          else
            document
              .getElementById("skus")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <section id="values" className="space-y-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Product description
        </h2>
        <p className="text-sm text-muted-foreground">{product.summary ?? "—"}</p>
        {product.highlights.length > 0 && (
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {product.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        )}
      </section>

      <section id="gallery" className="space-y-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Gallery ({product.gallery.length})
        </h2>
        {product.gallery.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No images attached — publishing is refused until there is one.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {product.gallery.map((fileId) => (
              <li key={fileId}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileDownloadUrl(fileId)}
                  alt=""
                  className="size-20 rounded border border-border object-cover"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="skus">
        <ProductSkuTable productId={product.id} categoryId={product.category_id} />
      </section>

      {dialog.kind === "edit" && (
        <EditProductDialog product={product} onClose={() => setDialog({ kind: "none" })} />
      )}

      {dialog.kind === "values" && (
        <ProductAttributeValuesPanel product={product} onClose={() => setDialog({ kind: "none" })} />
      )}
    </>
  );
}
