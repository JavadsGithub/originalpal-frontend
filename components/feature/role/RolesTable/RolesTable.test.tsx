import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RolesTableUI, { type RoleRowData, type RolesTableCallbacks } from "./index";
import { Permissions } from "@/lib/permissions";

const role: RoleRowData = {
  id: "67572815-e4a0-4b64-9e9d-8553b8f3ae10",
  name: "Admin",
  isActive: true,
  permissionCount: 4,
  permissionTitles: ["users:read", "users:update", "roles:read", "roles:update"],
  isSuperUserRole: false,
};

function callbacks(overrides: Partial<RolesTableCallbacks> = {}): RolesTableCallbacks {
  return {
    onCreate: vi.fn(),
    onEdit: vi.fn(),
    onToggleActive: vi.fn(),
    onManagePermissions: vi.fn(),
    onDelete: vi.fn(),
    onPageChange: vi.fn(),
    ...overrides,
  };
}

describe("RolesTableUI", () => {
  it("collapses long permission lists and reports how many are hidden", () => {
    render(
      <RolesTableUI
        roles={[role]}
        total={1}
        page={1}
        pages={1}
        canCreate
        canUpdate
        canDelete
        canAssignPermissions
        callbacks={callbacks()}
      />,
    );

    expect(screen.getByText("users:read")).toBeInTheDocument();
    expect(screen.queryByText("roles:update")).not.toBeInTheDocument();
    expect(screen.getByText("+1 more")).toBeInTheDocument();
  });

  it("marks the role that carries the super-user permission", () => {
    render(
      <RolesTableUI
        roles={[
          {
            ...role,
            permissionTitles: ["super:user"],
            isSuperUserRole: true,
          },
        ]}
        total={1}
        page={1}
        pages={1}
        canCreate={false}
        canUpdate={false}
        canDelete={false}
        canAssignPermissions={false}
        callbacks={callbacks()}
      />,
    );

    expect(screen.getByText("super user")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(Permissions.Super_User).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("offers the permission editor whenever roles:assign_permission is granted", () => {
    const handlers = callbacks();

    render(
      <RolesTableUI
        roles={[role]}
        total={1}
        page={1}
        pages={1}
        canCreate={false}
        canUpdate={false}
        canDelete={false}
        canAssignPermissions
        callbacks={handlers}
      />,
    );

    screen.getByRole("button", { name: "Permissions" }).click();
    expect(handlers.onManagePermissions).toHaveBeenCalledWith(role.id);
  });
});
