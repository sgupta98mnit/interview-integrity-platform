// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CodingWorkspace } from "./coding-workspace";

vi.mock("@monaco-editor/react", () => ({
  default: ({ value, onChange }: { value?: string; onChange?: (next: string) => void }) => (
    <textarea
      aria-label="Code Editor"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

vi.mock("@/features/events/use-integrity-signals", () => ({
  useIntegritySignals: () => ({
    trackEditorChange: vi.fn(),
    requestFullscreen: vi.fn(),
    flushNow: vi.fn(),
  }),
}));

describe("CodingWorkspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("runs tests and submits code", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            tests: [
              {
                name: "exports solve function",
                passed: true,
                message: "ok",
              },
            ],
            snapshotId: "snap_1",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            submitted: true,
            snapshotId: "snap_2",
            reviewUrl: "/review/sess_1",
          }),
        }),
    );

    render(<CodingWorkspace sessionId="sess_1" />);

    fireEvent.click(screen.getByRole("button", { name: "Run Tests" }));

    await waitFor(() => {
      expect(screen.getByText(/PASS: exports solve function/)).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getByText(/Submitted. Review page/)).toBeTruthy();
    });
  });
});
