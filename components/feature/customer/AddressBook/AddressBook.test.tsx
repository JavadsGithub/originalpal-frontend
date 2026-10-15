import { describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { server } from "@/tests/msw-server";
import { TEST_API_BASE, customerAddressFixture as address, pageOf } from "@/tests/fixtures";
import { renderWithProviders } from "@/tests/render";
import AddressBook from "./AddressBook";

/**
 * The address book talks to `/api/me/addresses/*`, which is scoped by the token rather than by a
 * permission — so this test pins the two behaviours the live server showed: a partial `PUT` for
 * "make default", and a `DELETE` that only happens after the confirmation.
 */
const authMock = vi.hoisted(() => ({
  user: {
    id: "95a00c27-1e8e-44d2-8160-88c92c2269e0",
    first_name: "Admin",
    last_name: "User",
    email: "admin@example.com",
    username: "admin",
    is_active: true,
    roles: [],
    created_at: "2026-10-15T17:56:49.141219Z",
    updated_at: "2026-10-15T17:56:49.141219Z",
  },
}));

vi.mock("@/components/layout/auth-provider", () => ({
  useAuth: () => ({
    user: authMock.user,
    isAuthenticated: true,
    isLoading: false,
    isSuperUser: false,
    hasPermission: () => false,
    hasAllPermissions: () => false,
    hasAnyPermission: () => false,
    hasRole: () => false,
    login: async () => {},
    logout: async () => {},
    refreshUser: async () => {},
  }),
}));

function listHandler(items = [address]) {
  return http.get(`${TEST_API_BASE}/me/addresses/`, () =>
    HttpResponse.json({
      success: true,
      message: "Customer addresses retrieved successfully",
      payload: pageOf(items, { size: 100 }),
    }),
  );
}

describe("AddressBook", () => {
  it("renders the rows with the formatted address and the default badge", async () => {
    server.use(listHandler());

    renderWithProviders(<AddressBook />);

    const row = await screen.findByTestId(`address-row-${address.id}`);
    expect(row).toHaveTextContent("Home");
    expect(row).toHaveTextContent("1 Beacon St, Boston 02108, US");
    expect(row).toHaveTextContent("Default");
    // A default address cannot be promoted again.
    expect(screen.queryByTestId(`make-default-${address.id}`)).not.toBeInTheDocument();
  });

  it("makes an address default with a partial PUT of {is_default:true}", async () => {
    const bodies: unknown[] = [];
    const other = { ...address, id: "other-id", label: "Office", is_default: false };

    server.use(
      listHandler([address, other]),
      http.put(`${TEST_API_BASE}/me/addresses/${other.id}`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({
          success: true,
          message: "Customer address updated successfully",
          payload: { ...other, is_default: true },
        });
      }),
    );

    renderWithProviders(<AddressBook />);

    fireEvent.click(await screen.findByTestId(`make-default-${other.id}`));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({ is_default: true });
  });

  it("deletes only after the confirmation dialog is accepted", async () => {
    const deleted: string[] = [];
    const other = { ...address, id: "other-id", label: "Office", is_default: false };

    server.use(
      listHandler([other]),
      http.delete(`${TEST_API_BASE}/me/addresses/${other.id}`, () => {
        deleted.push(other.id);
        return HttpResponse.json({
          success: true,
          message: "Customer address deleted successfully",
          payload: other,
        });
      }),
    );

    renderWithProviders(<AddressBook />);

    const row = await screen.findByTestId(`address-row-${other.id}`);
    fireEvent.click(within(row).getByRole("button", { name: "Delete" }));

    expect(deleted).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Delete address" }));
    await waitFor(() => expect(deleted).toEqual([other.id]));
  });

  it("shows the empty state with no addresses", async () => {
    server.use(listHandler([]));

    renderWithProviders(<AddressBook />);

    await waitFor(() => expect(screen.getByTestId("addresses-total")).toHaveTextContent("0 total"));
    expect(screen.getByText("No addresses yet — add one to speed up checkout.")).toBeInTheDocument();
  });
});
