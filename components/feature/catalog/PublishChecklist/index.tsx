"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PublishBlocker } from "@/lib/catalog-rules";
import { PRODUCT_STATUS_LABELS, type ProductStatus } from "@/lib/types/catalog";

export interface PublishChecklistTranslations {
  title: string;
  canPublish: string;
  blocked: string;
  publishButtonText: string;
  unpublishButtonText: string;
  publishingLabel: string;
  statusLabel: string;
  blockersHeading: string;
  openMediaButtonText: string;
  openSkusButtonText: string;
  openValuesButtonText: string;
  galleryRule: string;
  skuRule: string;
  valuesRule: string;
  requiredAttributesHeading: string;
  noRequiredAttributes: string;
}

export interface PublishChecklistCallbacks {
  onPublish: () => void;
  onUnpublish: () => void;
  /** Scroll/route the admin to the section that fixes a blocker. */
  onJumpTo: (blockerCode: PublishBlocker["code"]) => void;
}

export interface PublishChecklistUIProps {
  status: ProductStatus;
  blockers: PublishBlocker[];
  requiredAttributes: Array<{ name: string; levelLabel: string; satisfied: boolean }>;
  submitting: boolean;
  canPublish: boolean;
  canUnpublish: boolean;
  translations?: Partial<PublishChecklistTranslations>;
  callbacks: PublishChecklistCallbacks;
}

const defaultTranslations: PublishChecklistTranslations = {
  title: "Publication",
  canPublish: "Ready to publish — the backend's three gates are satisfied.",
  blocked: "Publication is blocked by the backend's own rules.",
  publishButtonText: "Publish",
  unpublishButtonText: "Unpublish",
  publishingLabel: "Working...",
  statusLabel: "Status",
  blockersHeading: "Blockers",
  openMediaButtonText: "Fix gallery",
  openSkusButtonText: "Fix SKUs",
  openValuesButtonText: "Fix values",
  galleryRule: "At least one gallery image is required.",
  skuRule: "At least one active SKU is required.",
  valuesRule: "Every required category attribute needs a value.",
  requiredAttributesHeading: "Required attributes",
  noRequiredAttributes: "This category declares no required attributes.",
};

/**
 * Tier 1 pure UI for the publish preconditions.
 *
 * The three rules are the backend's (`PublishProductUseCase._validate_publishable`), stated before
 * the click so the admin does not learn them one 422 at a time. Publishing still goes through the
 * endpoint, and if the state changed in the meantime its error wins.
 */
export default function PublishChecklistUI({
  status,
  blockers,
  requiredAttributes,
  submitting,
  canPublish,
  canUnpublish,
  translations = {},
  callbacks,
}: PublishChecklistUIProps) {
  const t = { ...defaultTranslations, ...translations };
  const ready = blockers.length === 0;
  const isPublished = status === "published";

  const blockerLabel = (code: PublishBlocker["code"]) =>
    code === "gallery" ? t.galleryRule : code === "skus" ? t.skuRule : t.valuesRule;

  const jumpLabel = (code: PublishBlocker["code"]) =>
    code === "gallery" ? t.openMediaButtonText : code === "skus" ? t.openSkusButtonText : t.openValuesButtonText;

  return (
    <section
      className="space-y-3 rounded-lg border border-border p-4"
      data-testid="publish-checklist"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{t.title}</h2>
          <Badge variant={isPublished ? "success" : ready ? "default" : "warning"}>
            {PRODUCT_STATUS_LABELS[status]}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {isPublished
            ? canUnpublish && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={callbacks.onUnpublish}
                >
                  {submitting ? t.publishingLabel : t.unpublishButtonText}
                </Button>
              )
            : canPublish && (
                <Button
                  type="button"
                  size="sm"
                  disabled={submitting}
                  data-testid="publish-product"
                  onClick={callbacks.onPublish}
                >
                  {submitting ? t.publishingLabel : t.publishButtonText}
                </Button>
              )}
        </div>
      </header>

      <p className="text-xs text-muted-foreground">{ready ? t.canPublish : t.blocked}</p>

      {!ready && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground">{t.blockersHeading}</h3>
          <ul className="space-y-1">
            {blockers.map((blocker) => (
              <li
                key={`${blocker.code}-${blocker.message}`}
                data-testid={`publish-blocker-${blocker.code}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border px-2.5 py-1.5"
              >
                <span className="text-xs text-foreground">{blockerLabel(blocker.code)}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[0.65rem] text-muted-foreground">
                    {blocker.message}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => callbacks.onJumpTo(blocker.code)}
                  >
                    {jumpLabel(blocker.code)}
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-1">
        <h3 className="text-xs font-semibold text-foreground">{t.requiredAttributesHeading}</h3>
        {requiredAttributes.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t.noRequiredAttributes}</p>
        ) : (
          <ul className="space-y-1">
            {requiredAttributes.map((attribute) => (
              <li key={attribute.name} className="flex items-center gap-2 text-xs">
                <Badge variant={attribute.satisfied ? "success" : "warning"}>
                  {attribute.satisfied ? "ok" : "missing"}
                </Badge>
                <span className="text-foreground">{attribute.name}</span>
                <span className="text-muted-foreground">({attribute.levelLabel})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
