import { describe, expect, it } from "vitest";

import { eventBatchSchema } from "./schema";

describe("eventBatchSchema", () => {
  it("accepts valid event batches", () => {
    const parsed = eventBatchSchema.safeParse({
      sessionId: "sess_123",
      events: [
        {
          clientEventId: "evt_1",
          tsISO: new Date().toISOString(),
          type: "FOCUS_LOSS",
          metadata: { reason: "blur" },
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects malformed payloads", () => {
    const parsed = eventBatchSchema.safeParse({
      sessionId: "sess_123",
      events: [{ clientEventId: "evt_1", type: "UNKNOWN" }],
    });

    expect(parsed.success).toBe(false);
  });
});
