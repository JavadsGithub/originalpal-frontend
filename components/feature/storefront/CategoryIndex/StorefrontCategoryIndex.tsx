"use client";

import useGetCategories from "@/data/feature/catalog/useGetCategories";
import type { Category } from "@/lib/types/catalog";
import CategoryIndexUI, { type CategoryTreeNode } from "./index";

/**
 * Builds the parent/child tree from the flat `GET /api/categories/` list.
 *
 * Exported because the product detail and the search bar reuse it; a category whose `parent_id`
 * points at something outside the fetched page is treated as a root rather than dropped.
 */
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>(
    categories.map((category) => [category.id, { ...category, depth: 0, children: [] }]),
  );
  const roots: CategoryTreeNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const assignDepth = (node: CategoryTreeNode, depth: number) => {
    node.depth = depth;
    node.children.forEach((child) => assignDepth(child, depth + 1));
  };
  roots.forEach((root) => assignDepth(root, 0));

  return roots;
}

/** Tier 2 injector for the category index. */
export default function StorefrontCategoryIndex() {
  const { categories, isLoading, isError, error, refetch } = useGetCategories({
    page: 1,
    size: 100,
  });

  // Category product counts are intentionally absent: the only endpoint that exposes them is the
  // public listing, which would mean one request per category (N+1) for a number nobody needs here.
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="category-index-loading">
        Loading categories...
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-2 text-sm text-destructive" data-testid="category-index-error">
        <p>{error?.message ?? "Failed to load categories"}</p>
        <button type="button" className="underline" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  return <CategoryIndexUI nodes={buildCategoryTree(categories)} />;
}
