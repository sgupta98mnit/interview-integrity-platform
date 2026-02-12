import { Prisma, type Event } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { computeReviewAnalysis } from "./scoring";

function makeEvent(
  id: string,
  type: Event["type"],
  tsISO: string,
  metadata: Record<string, unknown> = {},
): Event {
  return {
    id,
    sessionId: "sess_1",
    clientEventId: `client_${id}`,
    tsISO: new Date(tsISO),
    type,
    metadata: metadata as Prisma.JsonObject,
    createdAt: new Date(tsISO),
  };
}

describe("computeReviewAnalysis", () => {
  it("computes metrics and emits expected flags", () => {
    const events: Event[] = [
      makeEvent("1", "FOCUS_LOSS", "2026-02-12T10:00:00.000Z"),
      makeEvent("2", "FOCUS_LOSS", "2026-02-12T10:01:00.000Z"),
      makeEvent("3", "FOCUS_LOSS", "2026-02-12T10:02:00.000Z"),
      makeEvent("4", "FOCUS_LOSS", "2026-02-12T10:03:00.000Z"),
      makeEvent("5", "PAGE_HIDDEN", "2026-02-12T10:03:05.000Z"),
      makeEvent("6", "CLIPBOARD_PASTE", "2026-02-12T10:03:10.000Z"),
      makeEvent("7", "PASTE_ANALYZED", "2026-02-12T10:03:11.000Z", {
        length: 250,
        lineCount: 12,
      }),
      makeEvent("8", "TYPING_BUCKET", "2026-02-12T10:03:12.000Z", {
        bucketSecond: 1739354592,
        keypressCount: 2,
      }),
      makeEvent("9", "EDITOR_CHANGE", "2026-02-12T10:03:20.000Z", {
        insertedChars: 450,
        deletedChars: 0,
        largeJump: true,
      }),
      makeEvent("10", "FULLSCREEN_EXIT", "2026-02-12T10:03:22.000Z"),
      makeEvent("11", "IDLE", "2026-02-12T10:05:00.000Z", {
        idleForSeconds: 130,
      }),
      makeEvent("12", "IDLE", "2026-02-12T10:07:00.000Z", {
        idleForSeconds: 140,
      }),
    ];

    const result = computeReviewAnalysis(events);

    expect(result.metrics.focusLossCount).toBe(4);
    expect(result.metrics.hiddenCount).toBe(1);
    expect(result.metrics.pasteCount).toBe(1);
    expect(result.metrics.largePasteCount).toBe(1);
    expect(result.metrics.longestIdleSec).toBe(140);
    expect(result.metrics.bigEditCount).toBe(1);

    const codes = result.flags.map((flag) => flag.code);
    expect(codes).toContain("FOCUS_LOSS_SPIKE");
    expect(codes).toContain("LARGE_PASTE");
    expect(codes).toContain("BIG_EDIT_NO_TYPING");
    expect(codes).toContain("FULLSCREEN_EXIT");
    expect(codes).toContain("LONG_IDLE");
  });
});
