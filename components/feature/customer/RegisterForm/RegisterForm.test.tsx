import { describe, expect, it, vi } from "vitest";
import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { server } from "@/tests/msw-server";
import { TEST_API_BASE, adminUser } from "@/tests/fixtures";
import { renderWithProviders } from "@/tests/render";
import RegisterForm from "./RegisterForm";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

function fill(overrides: { password?: string } = {}) {
  fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Cus" } });
  fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Tomer" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "cus@example.com" } });
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "cus" } });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: overrides.password ?? "Secret123" },
  });
}

describe("RegisterForm", () => {
  it("posts the snake_case body the API expects and continues to the sign-in page", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${TEST_API_BASE}/auth/register`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({
          success: true,
          message: "Customer registered successfully",
          payload: { ...adminUser, is_active: true, roles: [] },
        });
      }),
    );

    renderWithProviders(<RegisterForm />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0]).toEqual({
      first_name: "Cus",
      last_name: "Tomer",
      email: "cus@example.com",
      username: "cus",
      password: "Secret123",
    });

    // Registration issues no token: the customer has to sign in, hence the flag on /login.
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login?registered=1"));
  });

  it("refuses a short password locally, without calling the API", async () => {
    const calls: unknown[] = [];
    server.use(
      http.post(`${TEST_API_BASE}/auth/register`, async ({ request }) => {
        calls.push(await request.json());
        return HttpResponse.json({ success: true, message: "", payload: adminUser });
      }),
    );

    renderWithProviders(<RegisterForm />);
    fill({ password: "short" });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("Password must be at least 8 characters long"),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the backend's 409 for an email that is already registered", async () => {
    server.use(
      http.post(`${TEST_API_BASE}/auth/register`, () =>
        HttpResponse.json(
          {
            success: false,
            message: "User with email 'cus@example.com' already exists",
            payload: { error_code: "CONFLICT", details: {}, status_code: 409 },
          },
          { status: 409 },
        ),
      ),
    );

    renderWithProviders(<RegisterForm />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByTestId("register-error")).toHaveTextContent(
      "User with email 'cus@example.com' already exists",
    );
    expect(push).not.toHaveBeenCalled();
  });
});
