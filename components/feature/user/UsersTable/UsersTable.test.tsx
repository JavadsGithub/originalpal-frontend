import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import UsersTableUI, { type UserRowData, type UsersTableCallbacks } from "./index";

const row: UserRowData = {
  id: "95a00c27-1e8e-44d2-8160-88c92c2269e0",
  username: "admin",
  fullName: "Admin User",
  email: "admin@example.com",
  roles: [{ id: "67572815-e4a0-4b64-9e9d-8553b8f3ae10", name: "Admin", isActive: true }],
  isActive: true,
  createdAt: "2026-10-15T17:56:49.141219Z",
};

function callbacks(overrides: Partial<UsersTableCallbacks> = {}): UsersTableCallbacks {
  return {
    onCreate: vi.fn(),
    onEdit: vi.fn(),
    onToggleActive: vi.fn(),
    onManageRoles: vi.fn(),
    onDelete: vi.fn(),
    onPageChange: vi.fn(),
    ...overrides,
  };
}

describe("UsersTableUI", () => {
  it("renders rows plus the backend total and hides every action it was not granted", () => {
    render(
      <UsersTableUI
        users={[row]}
        total={1}
        page={1}
        pages={1}
        canCreate={false}
        canUpdate={false}
        canDelete={false}
        canAssignRoles={false}
        callbacks={callbacks()}
      />,
    );

    expect(screen.getByTestId("users-total")).toHaveTextContent("1 total");
    expect(screen.getByTestId("user-row-admin")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();

    // No permission props → no action column at all.
    expect(screen.queryByRole("button", { name: "New user" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Roles" })).not.toBeInTheDocument();
  });

  it("asks to activate an inactive user rather than deactivate it", () => {
    const handlers = callbacks();

    render(
      <UsersTableUI
        users={[{ ...row, isActive: false }]}
        total={1}
        page={1}
        pages={1}
        canCreate={false}
        canUpdate
        canDelete={false}
        canAssignRoles={false}
        callbacks={handlers}
      />,
    );

    const toggle = screen.getByTestId("toggle-active-admin");
    expect(toggle).toHaveTextContent("Activate");

    toggle.click();
    expect(handlers.onToggleActive).toHaveBeenCalledWith(row.id, true);
  });

  it("paginates with the current page passed in from the API payload", () => {
    const handlers = callbacks();

    render(
      <UsersTableUI
        users={[row]}
        total={30}
        page={2}
        pages={3}
        canCreate
        canUpdate={false}
        canDelete={false}
        canAssignRoles={false}
        callbacks={handlers}
      />,
    );

    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();

    screen.getByRole("button", { name: "Previous" }).click();
    expect(handlers.onPageChange).toHaveBeenCalledWith(1);

    screen.getByRole("button", { name: "Next" }).click();
    expect(handlers.onPageChange).toHaveBeenCalledWith(3);
  });
});
