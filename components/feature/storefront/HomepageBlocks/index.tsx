"use client";

import ProductCard from "@/components/feature/storefront/ProductCard/index";
import { Badge } from "@/components/ui/badge";
import {
  blockCtaLabel,
  HOMEPAGE_BLOCK_TYPE_LABELS,
  isInternalHref,
  isPubliclyRenderableImage,
} from "@/lib/storefront-rules";
import type { Category } from "@/lib/types/catalog";
import type { HomepageBlock, PublicProductSummary } from "@/lib/types/storefront";
import Link from "next/link";

export interface HomepageBlockData {
  block: HomepageBlock;
  /** Resolved `target_ids`; unknown ids are reported instead of rendered. */
  products: PublicProductSummary[];
  categories: Category[];
  missingTargetIds: string[];
}

export interface HomepageBlocksTranslations {
  emptyState: string;
  missingTargets: string;
  bannerImageNotice: string;
}

export interface HomepageBlocksUIProps {
  blocks: HomepageBlockData[];
  translations?: Partial<HomepageBlocksTranslations>;
}

const defaultTranslations: HomepageBlocksTranslations = {
  emptyState:
    "This storefront has no homepage blocks yet. Blocks are managed in the back office once an admin has `homepage:create`.",
  missingTargets: "These ids no longer resolve to a public product or category:",
  bannerImageNotice:
    "This banner points at a file that is not publicly readable (`uploads:download` is required), so it cannot be shown here.",
};

/** `target_url` is free-form: a storefront route stays in-app, anything else opens in a new tab. */
function BlockTargetLink({ href, label }: { href: string; label: string }) {
  const className = "text-xs font-semibold hover:underline";

  if (isInternalHref(href)) {
    return (
      <Link href={href} className={className}>
        {label} →
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {label} →
    </a>
  );
}

function BlockShell({ block, children }: { block: HomepageBlock; children: React.ReactNode }) {
  const cta = blockCtaLabel(block);

  return (
    <section
      className="space-y-3 rounded-xl border border-border p-5"
      data-testid={`homepage-block-${block.id}`}
      data-block-type={block.block_type}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {block.title}
            </h2>
            <Badge variant="outline" data-testid={`homepage-block-type-${block.id}`}>
              {HOMEPAGE_BLOCK_TYPE_LABELS[block.block_type as keyof typeof HOMEPAGE_BLOCK_TYPE_LABELS] ??
                block.block_type}
            </Badge>
          </div>
          {block.subtitle && (
            <p className="text-xs text-muted-foreground">{block.subtitle}</p>
          )}
        </div>

        {cta && block.target_url && (
          <BlockTargetLink href={block.target_url} label={cta} />
        )}
      </header>

      {children}
    </section>
  );
}

/**
 * Tier 1 renderer for `GET /api/homepage/`.
 *
 * Each block is rendered by its `block_type`, and each carries its own state: a `products` block whose
 * `target_ids` no longer resolve (the API does not validate them, so a product can be archived after
 * the block was written) lists the dangling ids instead of showing an empty shelf.
 */
export default function HomepageBlocksUI({
  blocks,
  translations = {},
}: HomepageBlocksUIProps) {
  const t = { ...defaultTranslations, ...translations };

  if (blocks.length === 0) {
    return (
      <p
        className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground"
        data-testid="homepage-blocks-empty"
      >
        {t.emptyState}
      </p>
    );
  }

  return (
    <div className="space-y-6" data-testid="homepage-blocks">
      {blocks.map(({ block, products, categories, missingTargetIds }) => (
        <BlockShell key={block.id} block={block}>
          {block.block_type === "banner" && (
            <div className="space-y-3">
              {isPubliclyRenderableImage(block.image_url) ? (
                // eslint-disable-next-line @next/next/no-img-element -- editor-supplied URL, not a local asset
                <img
                  src={block.image_url ?? undefined}
                  alt={block.title}
                  className="w-full rounded-lg object-cover"
                  data-testid={`homepage-banner-image-${block.id}`}
                />
              ) : block.image_url ? (
                <p
                  className="rounded-lg bg-muted px-4 py-8 text-center text-xs text-muted-foreground"
                  data-testid={`homepage-banner-unavailable-${block.id}`}
                >
                  {t.bannerImageNotice}
                </p>
              ) : null}
              {block.target_url && (
                <span className="inline-block rounded-md border border-border px-3 py-1.5">
                  <BlockTargetLink href={block.target_url} label={blockCtaLabel(block) ?? "Open"} />
                </span>
              )}
            </div>
          )}

          {block.block_type === "products" && products.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {block.block_type === "categories" && categories.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.id}`}
                    className="inline-block rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {missingTargetIds.length > 0 && (
            <div
              className="space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
              data-testid={`homepage-block-missing-${block.id}`}
            >
              <p>{t.missingTargets}</p>
              <p className="font-mono">{missingTargetIds.join(", ")}</p>
            </div>
          )}
        </BlockShell>
      ))}
    </div>
  );
}
