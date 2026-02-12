// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LogoutButton } from "./logout-button";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    refresh.mockReset();
  });

  it("calls logout endpoint and redirects to /start", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
      }),
    );

    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Start New Session" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/session/logout", { method: "POST" });
      expect(push).toHaveBeenCalledWith("/start");
      expect(refresh).toHaveBeenCalled();
    });
  });
});
