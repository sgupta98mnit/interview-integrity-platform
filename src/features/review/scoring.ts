import type { Event } from "@prisma/client";

import {
  BIG_EDIT_INSERT_CHARS,
  BIG_EDIT_MIN_PRIOR_KEYS,
  BIG_EDIT_PRIOR_TYPING_WINDOW_SEC,
  FOCUS_SPIKE_COUNT,
  FOCUS_SPIKE_WINDOW_SEC,
  IDLE_SEC,
  LARGE_PASTE_CHARS,
  LARGE_PASTE_LINES,
  LONG_IDLE_REPEAT_COUNT,
} from "@/config/integrity";

import type { ReviewFlag, ReviewMetrics } from "./types";

function metadataNumber(metadata: unknown, key: string): number | null {
  if (typeof metadata !== "object" || metadata === null || !(key in metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  if (typeof value === "number") {
    return value;
  }

  return null;
}

function metadataBoolean(metadata: unknown, key: string): boolean | null {
  if (typeof metadata !== "object" || metadata === null || !(key in metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

export function computeReviewAnalysis(events: Event[]): {
  metrics: ReviewMetrics;
  flags: ReviewFlag[];
} {
  const ordered = [...events].sort(
    (left, right) => new Date(left.tsISO).getTime() - new Date(right.tsISO).getTime(),
  );

  const focusLossTimestamps: number[] = [];
  const typingBuckets = new Map<number, number>();
  const flags: ReviewFlag[] = [];

  let hiddenCount = 0;
  let pasteCount = 0;
  let largePasteCount = 0;
  let longestIdleSec = 0;
  let bigEditCount = 0;
  let longIdleHits = 0;

  for (const event of ordered) {
    const tsMs = new Date(event.tsISO).getTime();

    if (event.type === "FOCUS_LOSS") {
      focusLossTimestamps.push(tsMs);
    }

    if (event.type === "PAGE_HIDDEN") {
      hiddenCount += 1;
    }

    if (event.type === "CLIPBOARD_PASTE") {
      pasteCount += 1;
    }

    if (event.type === "PASTE_ANALYZED") {
      const length = metadataNumber(event.metadata, "length") ?? 0;
      const lineCount = metadataNumber(event.metadata, "lineCount") ?? 0;
      const isLarge = length > LARGE_PASTE_CHARS || lineCount > LARGE_PASTE_LINES;

      if (isLarge) {
        largePasteCount += 1;
        flags.push({
          code: "LARGE_PASTE",
          severity: "medium",
          tsISO: event.tsISO.toISOString(),
          details: { length, lineCount },
        });
      }
    }

    if (event.type === "TYPING_BUCKET") {
      const bucketSecond = metadataNumber(event.metadata, "bucketSecond");
      const keypressCount = metadataNumber(event.metadata, "keypressCount") ?? 0;

      if (bucketSecond !== null) {
        typingBuckets.set(bucketSecond, keypressCount);
      }
    }

    if (event.type === "IDLE") {
      const idleForSeconds = metadataNumber(event.metadata, "idleForSeconds") ?? 0;
      longestIdleSec = Math.max(longestIdleSec, idleForSeconds);
      if (idleForSeconds >= IDLE_SEC) {
        longIdleHits += 1;
      }
    }

    if (event.type === "EDITOR_CHANGE") {
      const insertedChars = metadataNumber(event.metadata, "insertedChars") ?? 0;
      const largeJump =
        insertedChars > BIG_EDIT_INSERT_CHARS ||
        metadataBoolean(event.metadata, "largeJump") === true;

      if (largeJump) {
        bigEditCount += 1;

        const windowStartSec = Math.floor(tsMs / 1000) - BIG_EDIT_PRIOR_TYPING_WINDOW_SEC;
        const windowEndSec = Math.floor(tsMs / 1000);
        let priorKeypresses = 0;

        for (let second = windowStartSec; second <= windowEndSec; second += 1) {
          priorKeypresses += typingBuckets.get(second) ?? 0;
        }

        if (priorKeypresses < BIG_EDIT_MIN_PRIOR_KEYS) {
          flags.push({
            code: "BIG_EDIT_NO_TYPING",
            severity: "high",
            tsISO: event.tsISO.toISOString(),
            details: {
              insertedChars,
              priorKeypresses,
            },
          });
        }
      }
    }

    if (event.type === "FULLSCREEN_EXIT") {
      flags.push({
        code: "FULLSCREEN_EXIT",
        severity: "medium",
        tsISO: event.tsISO.toISOString(),
        details: {},
      });
    }
  }

  for (let index = 0; index < focusLossTimestamps.length; index += 1) {
    const windowStart = focusLossTimestamps[index];
    let countInWindow = 0;

    for (let cursor = index; cursor < focusLossTimestamps.length; cursor += 1) {
      if (focusLossTimestamps[cursor] - windowStart <= FOCUS_SPIKE_WINDOW_SEC * 1000) {
        countInWindow += 1;
      }
    }

    if (countInWindow > FOCUS_SPIKE_COUNT) {
      flags.push({
        code: "FOCUS_LOSS_SPIKE",
        severity: "medium",
        tsISO: new Date(windowStart).toISOString(),
        details: {
          countInWindow,
          windowSeconds: FOCUS_SPIKE_WINDOW_SEC,
        },
      });
      break;
    }
  }

  if (longIdleHits >= LONG_IDLE_REPEAT_COUNT) {
    const idleEvent = [...ordered].reverse().find((event) => event.type === "IDLE");
    if (idleEvent) {
      flags.push({
        code: "LONG_IDLE",
        severity: "low",
        tsISO: idleEvent.tsISO.toISOString(),
        details: {
          repeats: longIdleHits,
          thresholdSec: IDLE_SEC,
        },
      });
    }
  }

  const typingCounts = [...typingBuckets.values()];
  const avgTypingRate =
    typingCounts.length === 0
      ? 0
      : Number((typingCounts.reduce((sum, count) => sum + count, 0) / typingCounts.length).toFixed(2));

  return {
    metrics: {
      focusLossCount: focusLossTimestamps.length,
      hiddenCount,
      pasteCount,
      largePasteCount,
      avgTypingRate,
      longestIdleSec,
      bigEditCount,
    },
    flags,
  };
}
