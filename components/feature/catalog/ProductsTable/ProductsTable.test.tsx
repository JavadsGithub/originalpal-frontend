import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import ProductsTableUI, {
  type ProductFilters,
  type ProductRowData,
  type ProductsTableCallbacks,
} from "./index";

const filters: ProductFilters = { search: "", status: "", categoryId: "", brandId: "" };

const row: ProductRowData = {
  id: "dad1907d-5cc0-4c92-b2c7-68d8d7be3ed7",
  title: "Chef knife",
  slug: "chef-knife",
  status: "draft",
  categoryName: "Kitchen knives",
  brandName: null,
  galleryCount: 1,
};

function callbacks(overrides: Partial<ProductsTableCallbacks> = {}): ProductsTableCallbacks {
  return {
    onCreate: vi.fn(),
    onFilterChange: vi.fn(),
    onEdit: vi.fn(),
    onPublish: vi.fn(),
    onUnpublish: vi.fn(),
    onArchive: vi.fn(),
    onPageChange: vi.fn(),
    ...overrides,
  };
}

describe("ProductsTableUI", () => {
  it("offers Publish for a draft and no Unpublish", () => {
    const handlers = callbacks();

    render(
      <ProductsTableUI
        products={[row]}
        filters={filters}
        categoryOptions={[{ id: "cat-1", label: "Kitchen knives" }]}
        brandOptions={[]}
        total={1}
        page={1}
        pages={1}
        canCreate
        canUpdate
        canPublish
        canUnpublish
        canArchive
        callbacks={handlers}
      />,
    );

    fireEvent.click(screen.getByTestId("publish-product-chef-knife"));
    expect(handlers.onPublish).toHaveBeenCalledWith(row.id);

    expect(screen.queryByTestId("unpublish-product-chef-knife")).not.toBeInTheDocument();
  });

  it("shows Unpublish instead once the product is live", () => {
    const handlers = callbacks();

    render(
      <ProductsTableUI
        products={[{ ...row, status: "published" }]}
        filters={filters}
        categoryOptions={[]}
        brandOptions={[]}
        total={1}
        page={1}
        pages={1}
        canCreate={false}
        canUpdate
        canPublish
        canUnpublish
        canArchive={false}
        callbacks={handlers}
      />,
    );

    expect(screen.queryByTestId("publish-product-chef-knife")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("unpublish-product-chef-knife"));
    expect(handlers.onUnpublish).toHaveBeenCalledWith(row.id);
  });

  it("hides every action when the caller has no catalog permissions", () => {
    render(
      <ProductsTableUI
        products={[row]}
        filters={filters}
        categoryOptions={[]}
        brandOptions={[]}
        total={1}
        page={1}
        pages={1}
        canCreate={false}
        canUpdate={false}
        canPublish={false}
        canUnpublish={false}
        canArchive={false}
        callbacks={callbacks()}
      />,
    );

    expect(screen.queryByRole("button", { name: "New product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    expect(screen.getByTestId("product-row-chef-knife")).toBeInTheDocument();
  });

  it("hands the whole filter set to the caller on submit, and clears it on reset", () => {
    const handlers = callbacks();

    render(
      <ProductsTableUI
        products={[]}
        filters={filters}
        categoryOptions={[{ id: "cat-1", label: "Kitchen knives" }]}
        brandOptions={[{ id: "brand-1", label: "Pal" }]}
        total={0}
        page={1}
        pages={1}
        canCreate={false}
        canUpdate={false}
        canPublish={false}
        canUnpublish={false}
        canArchive={false}
        callbacks={handlers}
      />,
    );

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "knife" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "published" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(handlers.onFilterChange).toHaveBeenCalledWith({
      search: "knife",
      status: "published",
      categoryId: "",
      brandId: "",
    });

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(handlers.onFilterChange).toHaveBeenLastCalledWith({
      search: "",
      status: "",
      categoryId: "",
      brandId: "",
    });
  });
});
