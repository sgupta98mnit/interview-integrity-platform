import { describe, expect, it } from "vitest";

import {
  BATCH_INTERVAL_MS,
  BIG_EDIT_INSERT_CHARS,
  EVENT_RATE_LIMIT_MAX_REQUESTS,
  EVENT_RATE_LIMIT_WINDOW_MS,
  IDLE_SEC,
  LARGE_PASTE_CHARS,
  LARGE_PASTE_LINES,
} from "./integrity";

describe("integrity config defaults", () => {
  it("keeps threshold defaults stable", () => {
    expect(BATCH_INTERVAL_MS).toBe(3000);
    expect(IDLE_SEC).toBe(120);
    expect(LARGE_PASTE_CHARS).toBe(200);
    expect(LARGE_PASTE_LINES).toBe(10);
    expect(BIG_EDIT_INSERT_CHARS).toBe(300);
    expect(EVENT_RATE_LIMIT_WINDOW_MS).toBe(60000);
    expect(EVENT_RATE_LIMIT_MAX_REQUESTS).toBe(30);
  });
});
