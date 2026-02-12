import { beforeEach, describe, expect, it, vi } from "vitest";

const { sessionFindMany } = vi.hoisted(() => ({
  sessionFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findMany: sessionFindMany,
    },
  },
}));

import { listSessionsForReview } from "./list-sessions";

describe("listSessionsForReview", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps session list with counts and flag totals", async () => {
    sessionFindMany.mockResolvedValue([
      {
        id: "sess_1",
        candidateName: "Jane",
        candidateEmail: "jane@example.com",
        status: "SUBMITTED",
        createdAt: new Date("2026-02-12T12:00:00.000Z"),
        submittedAt: new Date("2026-02-12T12:30:00.000Z"),
        _count: { events: 10, snapshots: 2 },
        reviewSummary: {
          flags: [{ code: "LARGE_PASTE" }, { code: "FOCUS_LOSS_SPIKE" }],
        },
      },
    ]);

    const result = await listSessionsForReview();

    expect(result).toEqual([
      {
        id: "sess_1",
        candidateName: "Jane",
        candidateEmail: "jane@example.com",
        status: "SUBMITTED",
        createdAtISO: "2026-02-12T12:00:00.000Z",
        submittedAtISO: "2026-02-12T12:30:00.000Z",
        eventCount: 10,
        snapshotCount: 2,
        flagCount: 2,
      },
    ]);
  });
});
