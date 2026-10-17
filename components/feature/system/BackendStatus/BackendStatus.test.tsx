import { describe, expect, it } from "vitest";
import { HttpResponse, http } from "msw";
import { screen, waitFor } from "@testing-library/react";
import { server } from "@/tests/msw-server";
import { TEST_API_BASE } from "@/tests/fixtures";
import { renderWithProviders } from "@/tests/render";
import BackendStatus from "./BackendStatus";

describe("BackendStatus", () => {
  it("reports a reachable API through the proxy", async () => {
    server.use(
      http.get(`${TEST_API_BASE}/ping`, () =>
        HttpResponse.json({ success: true, message: "pong", payload: null }),
      ),
    );

    renderWithProviders(<BackendStatus />);

    await waitFor(() =>
      expect(screen.getByTestId("backend-status")).toHaveAttribute("data-state", "online"),
    );
    expect(screen.getByText("API reachable")).toBeInTheDocument();
    expect(screen.getByTestId("backend-status-detail")).toHaveTextContent("pong");
  });

  it("reports an unreachable API with the reason from the client", async () => {
    server.use(http.get(`${TEST_API_BASE}/ping`, () => HttpResponse.error()));

    renderWithProviders(<BackendStatus />);

    await waitFor(() =>
      expect(screen.getByTestId("backend-status")).toHaveAttribute("data-state", "offline"),
    );
    expect(screen.getByText("API unreachable")).toBeInTheDocument();
    expect(screen.getByTestId("backend-status-detail")).toHaveTextContent("Cannot reach the API");
  });
});
