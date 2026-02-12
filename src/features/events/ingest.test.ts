import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeSessionFromToken, eventCreate } = vi.hoisted(() => ({
  authorizeSessionFromToken: vi.fn(),
  eventCreate: vi.fn(),
}));

vi.mock("@/features/session/auth", () => ({
  authorizeSessionFromToken,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      create: eventCreate,
    },
  },
}));

import { ingestEventBatch } from "./ingest";

describe("ingestEventBatch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects invalid payload", async () => {
    const result = await ingestEventBatch({
      body: { sessionId: "s1", events: [{ type: "BAD" }] },
      rawToken: "token",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
    }
  });

  it("rejects unauthorized requests", async () => {
    authorizeSessionFromToken.mockResolvedValue(false);

    const result = await ingestEventBatch({
      body: {
        sessionId: "s1",
        events: [
          {
            clientEventId: "evt_1",
            tsISO: new Date().toISOString(),
            type: "FOCUS_LOSS",
            metadata: {},
          },
        ],
      },
      rawToken: "token",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it("ingests valid events", async () => {
    authorizeSessionFromToken.mockResolvedValue(true);
    eventCreate.mockResolvedValue({});

    const result = await ingestEventBatch({
      body: {
        sessionId: "s1",
        events: [
          {
            clientEventId: "evt_1",
            tsISO: new Date().toISOString(),
            type: "FOCUS_LOSS",
            metadata: { source: "window" },
          },
        ],
      },
      rawToken: "token",
    });

    expect(result).toEqual({
      ok: true,
      ingestedCount: 1,
      droppedCount: 0,
    });
  });

  it("drops duplicate events without failing the batch", async () => {
    authorizeSessionFromToken.mockResolvedValue(true);
    eventCreate
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ code: "P2002" });

    const result = await ingestEventBatch({
      body: {
        sessionId: "s1",
        events: [
          {
            clientEventId: "evt_1",
            tsISO: new Date().toISOString(),
            type: "FOCUS_LOSS",
            metadata: {},
          },
          {
            clientEventId: "evt_1",
            tsISO: new Date().toISOString(),
            type: "FOCUS_LOSS",
            metadata: {},
          },
        ],
      },
      rawToken: "token",
    });

    expect(result).toEqual({
      ok: true,
      ingestedCount: 1,
      droppedCount: 1,
    });
  });
});
