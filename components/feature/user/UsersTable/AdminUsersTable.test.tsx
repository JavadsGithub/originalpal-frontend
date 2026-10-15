import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { server } from "@/tests/msw-server";
import { TEST_API_BASE, adminRole, adminUser, pageOf } from "@/tests/fixtures";
import { renderWithProviders } from "@/tests/render";
import { Permissions } from "@/lib/permissions";
import AdminUsersTable from "./AdminUsersTable";

/**
 * The injector reads its gates from `useAuth`; the mock lets each test hand out exactly the
 * permissions the backend would enforce for the matching endpoint.
 */
const granted = vi.hoisted(() => ({ permissions: [] as string[] }));

const mockUser = vi.hoisted(() => ({
  id: "95a00c27-1e8e-44d2-8160-88c92c2269e0",
  first_name: "Admin",
  last_name: "User",
  email: "admin@example.com",
  username: "admin",
  is_active: true,
  roles: [
    {
      id: "67572815-e4a0-4b64-9e9d-8553b8f3ae10",
      name: "Admin",
      is_active: true,
      permission_ids: [],
      created_at: "2026-10-15T17:56:49.141219Z",
      updated_at: "2026-10-15T17:56:49.141219Z",
    },
  ],
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

describe("AdminUsersTable", () => {
  beforeEach(() => {
    granted.permissions = [];
  });

  it("loads the first page through GET /users/", async () => {
    const requested: string[] = [];
    server.use(
      http.get(`${TEST_API_BASE}/users/`, ({ request }) => {
        requested.push(new URL(request.url).search);
        return HttpResponse.json({
          success: true,
          message: "Users retrieved successfully",
          payload: pageOf([adminUser]),
        });
      }),
    );

    renderWithProviders(<AdminUsersTable />);

    await waitFor(() => expect(screen.getByTestId("user-row-admin")).toBeInTheDocument());
    expect(requested[0]).toContain("page=1");
  });

  it("sends a partial PUT /users/{id} with only is_active when toggling activation", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.get(`${TEST_API_BASE}/users/`, () =>
        HttpResponse.json({
          success: true,
          message: "Users retrieved successfully",
          payload: pageOf([adminUser]),
        }),
      ),
      http.put(`${TEST_API_BASE}/users/${adminUser.id}`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({
          success: true,
          message: "User updated successfully",
          payload: { ...adminUser, is_active: false },
        });
      }),
    );

    granted.permissions = [Permissions.Users_Read, Permissions.Users_Update];
    renderWithProviders(<AdminUsersTable />);

    const toggle = await screen.findByTestId("toggle-active-admin");
    fireEvent.click(toggle);

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ is_active: false });
  });

  it("assigns a role through POST /users/{id}/roles/{roleId} and reflects it in the dialog", async () => {
    const assigned: string[] = [];
    const role = { ...adminRole, permission_ids: [Permissions.Roles_Read] };

    server.use(
      http.get(`${TEST_API_BASE}/users/`, () =>
        HttpResponse.json({
          success: true,
          message: "Users retrieved successfully",
          payload: pageOf([{ ...adminUser, roles: [] }]),
        }),
      ),
      http.get(`${TEST_API_BASE}/roles/`, () =>
        HttpResponse.json({
          success: true,
          message: "Roles retrieved successfully",
          payload: pageOf([role], { size: 100 }),
        }),
      ),
      http.post(`${TEST_API_BASE}/users/${adminUser.id}/roles/${role.id}`, () => {
        assigned.push(role.id);
        return HttpResponse.json({
          success: true,
          message: "Role assigned successfully",
          payload: adminUser,
        });
      }),
    );

    granted.permissions = [
      Permissions.Users_Read,
      Permissions.Users_AssignRole,
      Permissions.Users_UnassignRole,
    ];
    renderWithProviders(<AdminUsersTable />);

    fireEvent.click(await screen.findByRole("button", { name: "Roles" }));

    const checkbox = await screen.findByRole("checkbox", { name: `${role.name} role` });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    await waitFor(() => expect(assigned).toEqual([role.id]));
    await waitFor(() => expect(checkbox).toBeChecked());
  });

  it("hides the action column entirely for a user that may only read", async () => {
    server.use(
      http.get(`${TEST_API_BASE}/users/`, () =>
        HttpResponse.json({
          success: true,
          message: "Users retrieved successfully",
          payload: pageOf([adminUser]),
        }),
      ),
    );

    granted.permissions = [Permissions.Users_Read];
    renderWithProviders(<AdminUsersTable />);

    await screen.findByTestId("user-row-admin");
    expect(screen.queryByRole("button", { name: "New user" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("toggle-active-admin")).not.toBeInTheDocument();
  });
});
