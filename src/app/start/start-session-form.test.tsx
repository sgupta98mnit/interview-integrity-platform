// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { StartSessionForm } from "./start-session-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

describe("StartSessionForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
  });

  it("submits and redirects to returned session url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ sessionId: "sess_1", nextUrl: "/session/sess_1" }),
      }),
    );

    render(<StartSessionForm />);

    fireEvent.change(screen.getByPlaceholderText("Jane Doe"), {
      target: { value: "Jane" },
    });
    fireEvent.change(screen.getByPlaceholderText("jane@example.com"), {
      target: { value: "jane@example.com" },
    });

    fireEvent.submit(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/session/sess_1");
    });
  });
});
