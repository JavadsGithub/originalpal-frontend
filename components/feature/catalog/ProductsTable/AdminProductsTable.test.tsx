import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { server } from "@/tests/msw-server";
import { TEST_API_BASE, categoryFixture, pageOf, productFixture } from "@/tests/fixtures";
import { renderWithProviders } from "@/tests/render";
import { Permissions } from "@/lib/permissions";
import AdminProductsTable from "./AdminProductsTable";

/**
 * Injector-level tests for the product list: the paths, the payloads and the permission gates have to
 * match what the live server answered (see `docs/integration/contract-audit.md` §10).
 */
const granted = vi.hoisted(() => ({ permissions: [] as string[] }));

const mockUser = vi.hoisted(() => ({
  id: "95a00c27-1e8e-44d2-8160-88c92c2269e0",
  first_name: "Admin",
  last_name: "User",
  email: "admin@example.com",
  username: "admin",
  is_active: true,
  roles: [],
  created_at: "2026-10-15T17:56:49.141219Z",
  updated_at: "2026-10-15T17:56:49.141219Z",
}));

vi.mock("@/components/layout/auth-provider", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
    isSuperUser: false,
    hasPermission: (permission: string) => granted.permissions.includes(permission),
    hasAllPermissions: (permissions: string[]) =>
      permissions.every((permission) => granted.permissions.includes(permission)),
    hasAnyPermission: (permissions: string[]) =>
      permissions.some((permission) => granted.permissions.includes(permission)),
    hasRole: () => false,
    login: async () => {},
    logout: async () => {},
    refreshUser: async () => {},
  }),
}));

function stubOptions() {
  server.use(
    http.get(`${TEST_API_BASE}/categories/`, () =>
      HttpResponse.json({
        success: true,
        message: "Categories retrieved successfully",
        payload: pageOf([categoryFixture], { size: 100 }),
      }),
    ),
    http.get(`${TEST_API_BASE}/brands/`, () =>
      HttpResponse.json({
        success: true,
        message: "Brands retrieved successfully",
        payload: pageOf([], { size: 100 }),
      }),
    ),
  );
}

describe("AdminProductsTable", () => {
  beforeEach(() => {
    granted.permissions = [];
  });

  it("loads the first page through GET /products/ and resolves the category name", async () => {
    const requested: string[] = [];
    stubOptions();
    server.use(
      http.get(`${TEST_API_BASE}/products/`, ({ request }) => {
        requested.push(new URL(request.url).search);
        return HttpResponse.json({
          success: true,
          message: "Products retrieved successfully",
          payload: pageOf([productFixture]),
        });
      }),
    );

    renderWithProviders(<AdminProductsTable />);

    const row = await screen.findByTestId("product-row-chef-knife");
    expect(row).toHaveTextContent("Kitchen knives");
    expect(requested[0]).toContain("page=1");
    expect(requested[0]).toContain("size=50");
  });

  it("publishes through POST /products/{id}/publish and shows the backend's refusal", async () => {
    const published: string[] = [];
    stubOptions();
    server.use(
      http.get(`${TEST_API_BASE}/products/`, () =>
        HttpResponse.json({
          success: true,
          message: "Products retrieved successfully",
          payload: pageOf([productFixture]),
        }),
      ),
      http.post(`${TEST_API_BASE}/products/${productFixture.id}/publish`, () => {
        published.push(productFixture.id);
        return HttpResponse.json(
          {
            success: false,
            message: "Product requires a primary image before publication",
            payload: {
              error_code: "VALIDATION_ERROR",
              details: { field: "gallery" },
            },
          },
          { status: 422 },
        );
      }),
    );

    granted.permissions = [Permissions.Products_Publish];
    renderWithProviders(<AdminProductsTable />);

    fireEvent.click(await screen.findByTestId("publish-product-chef-knife"));

    await waitFor(() => expect(published).toHaveLength(1));
    // The product list has no publish permission for anyone else, so no other request can happen.
    expect(await screen.findByTestId("products-action-error")).toHaveTextContent(
      "Product requires a primary image before publication",
    );
  });

  it("archives only after the confirmation, sending DELETE /products/{id}", async () => {
    const deleted: string[] = [];
    stubOptions();
    server.use(
      http.get(`${TEST_API_BASE}/products/`, () =>
        HttpResponse.json({
          success: true,
          message: "Products retrieved successfully",
          payload: pageOf([productFixture]),
        }),
      ),
      http.delete(`${TEST_API_BASE}/products/${productFixture.id}`, () => {
        deleted.push(productFixture.id);
        return HttpResponse.json({
          success: true,
          message: "Product deleted successfully",
          payload: { ...productFixture, status: "archived" },
        });
      }),
    );

    granted.permissions = [Permissions.Products_Delete];
    renderWithProviders(<AdminProductsTable />);

    const row = await screen.findByTestId("product-row-chef-knife");
    fireEvent.click(within(row).getByRole("button", { name: "Archive" }));

    // Nothing is sent until the dialog is confirmed.
    expect(deleted).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Archive product" }));
    await waitFor(() => expect(deleted).toEqual([productFixture.id]));
  });

  it("hides the create action without products:create", async () => {
    stubOptions();
    server.use(
      http.get(`${TEST_API_BASE}/products/`, () =>
        HttpResponse.json({
          success: true,
          message: "Products retrieved successfully",
          payload: pageOf([]),
        }),
      ),
    );

    granted.permissions = [];
    renderWithProviders(<AdminProductsTable />);

    await waitFor(() => expect(screen.getByTestId("products-table")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "New product" })).not.toBeInTheDocument();
  });
});
