"use client";

import useGetCategories from "@/data/feature/catalog/useGetCategories";
import { buildCategoryTree } from "./StorefrontCategoryIndex";
import type { CategoryTreeNode } from "./index";
import Link from "next/link";

/** Walks the tree to the node, returning the root→node chain. */
function findPath(nodes: CategoryTreeNode[], id: string): CategoryTreeNode[] | null {
  for (const node of nodes) {
    if (node.id === id) return [node];
    const childPath = findPath(node.children, id);
    if (childPath) return [node, ...childPath];
  }
  return null;
}

/**
 * Tier 2 header for one category: its name, the path that leads to it, and — the part that matters
 * for this API — its **children**, because the public `category_id` filter does not include subtrees.
 */
export default function CategoryBreadcrumb({ categoryId }: { categoryId: string }) {
  const { categories, isLoading } = useGetCategories({ page: 1, size: 100 });

  if (isLoading) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="category-breadcrumb-loading">
        Loading category...
      </p>
    );
  }

  const path = findPath(buildCategoryTree(categories), categoryId);
  const current = path?.[path.length - 1];

  if (!current) {
    return (
      <div className="space-y-1" data-testid="category-breadcrumb">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Category</h1>
        <p className="text-xs text-muted-foreground">
          This category id is not in the catalog any more — the products below are still filtered by
          it.{" "}
          <Link href="/categories" className="font-semibold hover:underline">
            See all categories
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="category-breadcrumb">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Link href="/categories" className="hover:underline">
          Categories
        </Link>
        {path.slice(0, -1).map((node) => (
          <span key={node.id} className="flex items-center gap-1">
            <span>/</span>
            <Link href={`/categories/${node.id}`} className="hover:underline">
              {node.name}
            </Link>
          </span>
        ))}
      </nav>

      <h1 className="text-xl font-semibold tracking-tight text-foreground" data-testid="category-title">
        {current.name}
      </h1>

      {current.children.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Subcategories are <strong>not</strong> included in this listing (`category_id` is an exact
            match), so browse them directly:
          </p>
          <ul className="flex flex-wrap gap-2" data-testid="category-children">
            {current.children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/categories/${child.id}`}
                  data-testid={`category-child-${child.slug}`}
                  className="inline-block rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-muted"
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
