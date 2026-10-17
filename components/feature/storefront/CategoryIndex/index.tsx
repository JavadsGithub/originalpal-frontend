"use client";

import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Category } from "@/lib/types/catalog";

export interface CategoryIndexTranslations {
  heading: string;
  description: string;
  emptyState: string;
  rootLabel: string;
  productCountHint: string;
  subcategoryLabel: string;
  loadingState: string;
}

export interface CategoryTreeNode extends Category {
  depth: number;
  children: CategoryTreeNode[];
}

export interface CategoryIndexUIProps {
  nodes: CategoryTreeNode[];
  /** Products per category id, when the caller has them. */
  productCounts?: Map<string, number>;
  translations?: Partial<CategoryIndexTranslations>;
}

const defaultTranslations: CategoryIndexTranslations = {
  heading: "Categories",
  description:
    "Browsing is by one exact category — the API's `category_id` filter does not include subcategories, so each category links to its own children instead of pretending to cover them.",
  emptyState: "No categories yet.",
  rootLabel: "Root",
  productCountHint: "products",
  subcategoryLabel: "refines",
  loadingState: "Loading categories...",
};

function CategoryNode({
  node,
  productCounts,
  t,
}: {
  node: CategoryTreeNode;
  productCounts?: Map<string, number>;
  t: CategoryIndexTranslations;
}) {
  return (
    <li className="space-y-2">
      <div className="flex flex-wrap items-center gap-2" style={{ paddingLeft: node.depth * 16 }}>
        <Link
          href={`/categories/${node.id}`}
          data-testid={`category-link-${node.slug}`}
          className="text-sm font-semibold text-foreground hover:underline"
        >
          {node.name}
        </Link>
        <span className="font-mono text-xs text-muted-foreground">{node.slug}</span>
        {productCounts && (
          <Badge variant="outline">
            {productCounts.get(node.id) ?? 0} {t.productCountHint}
          </Badge>
        )}
        {node.children.length > 0 && (
          <Badge variant="outline">
            {node.children.length} {t.subcategoryLabel}
          </Badge>
        )}
      </div>

      {node.children.length > 0 && (
        <ul className="space-y-2">
          {node.children.map((child) => (
            <CategoryNode key={child.id} node={child} productCounts={productCounts} t={t} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Tier 1 category index.
 *
 * `GET /api/categories/` returns a flat list (`parent_id` carries the tree), so the tree is built
 * once — `buildCategoryTree` — and rendered recursively.
 */
export default function CategoryIndexUI({
  nodes,
  productCounts,
  translations = {},
}: CategoryIndexUIProps) {
  const t = { ...defaultTranslations, ...translations };

  return (
    <section className="space-y-4" data-testid="category-index">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t.heading}</h1>
        <p className="max-w-3xl text-xs text-muted-foreground">{t.description}</p>
      </header>

      {nodes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {t.emptyState}
        </p>
      ) : (
        <ul className="space-y-3">
          {nodes.map((node) => (
            <CategoryNode key={node.id} node={node} productCounts={productCounts} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}
