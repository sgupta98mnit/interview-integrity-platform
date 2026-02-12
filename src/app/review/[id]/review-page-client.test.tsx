// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ReviewResponse } from "@/features/review/summary";

import { ReviewPageClient } from "./review-page-client";

const reviewFixture: ReviewResponse = {
  session: {
    id: "sess_1",
    candidateName: "Jane",
    candidateEmail: "jane@example.com",
    status: "SUBMITTED",
    createdAt: "2026-02-12T10:00:00.000Z",
    submittedAt: "2026-02-12T10:30:00.000Z",
  },
  metrics: {
    focusLossCount: 1,
    hiddenCount: 0,
    pasteCount: 1,
    largePasteCount: 0,
    avgTypingRate: 3,
    longestIdleSec: 42,
    bigEditCount: 0,
  },
  flags: [
    {
      code: "FULLSCREEN_EXIT",
      severity: "medium",
      tsISO: "2026-02-12T10:11:00.000Z",
      details: {},
    },
  ],
  events: [
    {
      id: "evt_1",
      sessionId: "sess_1",
      clientEventId: "client_1",
      tsISO: "2026-02-12T10:10:00.000Z",
      type: "FOCUS_LOSS",
      metadata: {},
      createdAt: "2026-02-12T10:10:00.000Z",
    },
    {
      id: "evt_2",
      sessionId: "sess_1",
      clientEventId: "client_2",
      tsISO: "2026-02-12T10:11:00.000Z",
      type: "FULLSCREEN_EXIT",
      metadata: {},
      createdAt: "2026-02-12T10:11:00.000Z",
    },
  ],
  snapshots: [
    {
      id: "snap_1",
      kind: "RUN",
      language: "typescript",
      tsISO: "2026-02-12T10:12:00.000Z",
      createdAt: "2026-02-12T10:12:00.000Z",
      code: "line1",
    },
  ],
  diffs: [
    {
      fromSnapshotId: "snap_1",
      toSnapshotId: "snap_2",
      fromKind: "RUN",
      toKind: "SUBMIT",
      changes: [
        { type: "context", line: "line1" },
        { type: "add", line: "line2" },
      ],
    },
  ],
  generatedAtISO: "2026-02-12T10:31:00.000Z",
};

describe("ReviewPageClient", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:mock"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("filters timeline by event type", () => {
    render(<ReviewPageClient review={reviewFixture} />);

    fireEvent.change(screen.getByLabelText("Filter"), {
      target: { value: "FULLSCREEN_EXIT" },
    });

    const timelineItems = screen.getAllByTestId("timeline-event");
    expect(timelineItems).toHaveLength(1);
    expect(timelineItems[0].getAttribute("data-event-type")).toBe("FULLSCREEN_EXIT");
  });

  it("exports session audit JSON", () => {
    render(<ReviewPageClient review={reviewFixture} />);

    const exportButtons = screen.getAllByRole("button", { name: "Export JSON" });
    fireEvent.click(exportButtons[0]);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
