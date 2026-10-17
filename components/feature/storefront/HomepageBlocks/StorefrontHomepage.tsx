"use client";

import useGetHomepage from "@/data/feature/storefront/useGetHomepage";
import useGetPublicProducts from "@/data/feature/storefront/useGetPublicProducts";
import useGetCategories from "@/data/feature/catalog/useGetCategories";
import { resolveBlockTargets } from "@/lib/storefront-rules";
import type { HomepageBlockData } from "./index";
import HomepageBlocksUI from "./index";

/**
 * Tier 2 injector for the homepage.
 *
 * The blocks come from `GET /api/homepage/`; their `target_ids` are resolved against the public
 * product list and the category list — the same reads a shopper's browser makes anyway, so the screen
 * costs three requests and no per-block N+1.
 */
export default function StorefrontHomepage() {
  const { blocks, isLoading, isError, error, refetch } = useGetHomepage();

  // The public catalog caps `size` at 100 (bigger is a FastAPI 422); this is the storefront's first
  // screen, so it reads one page and lets the block's own links carry the shopper further.
  const { products } = useGetPublicProducts({ page: 1, size: 100 });
  const { categories } = useGetCategories({ page: 1, size: 100 });

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="homepage-loading">
        Loading the homepage...
      </p>
    );
  }

  if (isError) {
    return (
      <div className="space-y-2 text-sm text-destructive" data-testid="homepage-error">
        <p>{error?.message ?? "Failed to load the homepage"}</p>
        <button type="button" className="underline" onClick={refetch}>
          Retry
        </button>
      </div>
    );
  }

  const data: HomepageBlockData[] = blocks.map((block) => {
    if (block.block_type === "products") {
      const { resolved, missing } = resolveBlockTargets(block, products);
      return { block, products: resolved, categories: [], missingTargetIds: missing };
    }

    if (block.block_type === "categories") {
      const { resolved, missing } = resolveBlockTargets(block, categories);
      return { block, products: [], categories: resolved, missingTargetIds: missing };
    }

    return { block, products: [], categories: [], missingTargetIds: [] };
  });

  return <HomepageBlocksUI blocks={data} />;
}
