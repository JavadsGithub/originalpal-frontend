import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import CategoryIndexUI from "./index";
import { buildCategoryTree } from "./StorefrontCategoryIndex";
import { categoryFixture } from "@/tests/fixtures";
import type { Category } from "@/lib/types/catalog";

const child: Category = {
  id: "2b829597-b215-4fa2-9c78-eb9fb2f2ef1e",
  name: "Santoku knives",
  slug: "santoku-knives",
  parent_id: categoryFixture.id,
  created_at: categoryFixture.created_at,
  updated_at: categoryFixture.updated_at,
};

const orphan: Category = {
  ...child,
  id: "3c9306a8-c326-4ab3-8d89-fc0fc3f3fa2f",
  name: "Orphan",
  slug: "orphan",
  // A parent that is not in the fetched list — the tree keeps it as a root instead of dropping it.
  parent_id: "99999999-0000-4000-8000-000000000000",
};

describe("CategoryIndexUI", () => {
  it("nests children under their parent and reports the subcategory count", () => {
    render(<CategoryIndexUI nodes={buildCategoryTree([categoryFixture, child])} />);

    expect(screen.getByTestId("category-link-kitchen-knives")).toHaveAttribute(
      "href",
      `/categories/${categoryFixture.id}`,
    );
    expect(screen.getByTestId("category-link-santoku-knives")).toBeInTheDocument();
    expect(screen.getByText("1 refines")).toBeInTheDocument();
  });

  it("keeps a category whose parent is missing as a root", () => {
    render(<CategoryIndexUI nodes={buildCategoryTree([categoryFixture, orphan])} />);

    expect(screen.getByTestId("category-link-orphan")).toBeInTheDocument();
  });

  it("says the listing does not include subcategories, because the API does not", () => {
    render(<CategoryIndexUI nodes={buildCategoryTree([categoryFixture])} />);

    expect(screen.getByTestId("category-index")).toHaveTextContent(
      "does not include subcategories",
    );
  });

  it("renders an empty state for a catalog without categories", () => {
    render(<CategoryIndexUI nodes={[]} />);

    const empty = within(screen.getByTestId("category-index"));
    expect(empty.getByText("No categories yet.")).toBeInTheDocument();
  });
});
