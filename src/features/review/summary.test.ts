import { beforeEach, describe, expect, it, vi } from "vitest";

const { sessionFindUnique, reviewSummaryCreate, reviewSummaryUpsert } = vi.hoisted(() => ({
  sessionFindUnique: vi.fn(),
  reviewSummaryCreate: vi.fn(),
  reviewSummaryUpsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: sessionFindUnique,
    },
    reviewSummary: {
      create: reviewSummaryCreate,
      upsert: reviewSummaryUpsert,
    },
  },
}));

import { buildReviewResponse, computeAndPersistReviewSummary } from "./summary";

describe("review summary", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("computes and persists summary on submit path", async () => {
    sessionFindUnique.mockResolvedValue({
      id: "sess_1",
      events: [],
    });

    const result = await computeAndPersistReviewSummary("sess_1");

    expect(result).toEqual({
      metrics: {
        focusLossCount: 0,
        hiddenCount: 0,
        pasteCount: 0,
        largePasteCount: 0,
        avgTypingRate: 0,
        longestIdleSec: 0,
        bigEditCount: 0,
      },
      flags: [],
    });
    expect(reviewSummaryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: "sess_1" },
      }),
    );
  });

  it("builds review response contract with diffs", async () => {
    sessionFindUnique.mockResolvedValue({
      id: "sess_1",
      candidateName: "Jane",
      candidateEmail: "jane@example.com",
      status: "SUBMITTED",
      createdAt: new Date("2026-02-12T10:00:00.000Z"),
      submittedAt: new Date("2026-02-12T10:10:00.000Z"),
      events: [
        {
          id: "evt_1",
          sessionId: "sess_1",
          clientEventId: "client_1",
          tsISO: new Date("2026-02-12T10:01:00.000Z"),
          type: "FOCUS_LOSS",
          metadata: {},
          createdAt: new Date("2026-02-12T10:01:00.000Z"),
        },
      ],
      snapshots: [
        {
          id: "snap_1",
          kind: "RUN",
          language: "typescript",
          tsISO: new Date("2026-02-12T10:02:00.000Z"),
          createdAt: new Date("2026-02-12T10:02:00.000Z"),
          code: "line1\nline2",
        },
        {
          id: "snap_2",
          kind: "SUBMIT",
          language: "typescript",
          tsISO: new Date("2026-02-12T10:03:00.000Z"),
          createdAt: new Date("2026-02-12T10:03:00.000Z"),
          code: "line1\nline2 updated",
        },
      ],
      reviewSummary: null,
    });

    const result = await buildReviewResponse("sess_1");

    expect(result?.session.id).toBe("sess_1");
    expect(result?.metrics.focusLossCount).toBe(1);
    expect(result?.events.length).toBe(1);
    expect(result?.snapshots.length).toBe(2);
    expect(result?.diffs.length).toBe(1);
    expect(result?.generatedAtISO).toBeTruthy();
    expect(reviewSummaryCreate).toHaveBeenCalled();
  });
});
