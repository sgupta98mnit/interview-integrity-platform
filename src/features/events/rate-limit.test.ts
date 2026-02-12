import { describe, expect, it } from "vitest";

import {
  EVENT_RATE_LIMIT_MAX_REQUESTS,
  EVENT_RATE_LIMIT_WINDOW_MS,
} from "@/config/integrity";

import { checkEventRateLimit, resetEventRateLimitStore } from "./rate-limit";

describe("checkEventRateLimit", () => {
  it("blocks after exceeding the configured window cap", () => {
    resetEventRateLimitStore();
    const key = "127.0.0.1:sess_1";
    const now = Date.now();

    for (let index = 0; index < EVENT_RATE_LIMIT_MAX_REQUESTS; index += 1) {
      const result = checkEventRateLimit(key, now + index);
      expect(result.allowed).toBe(true);
    }

    const blocked = checkEventRateLimit(key, now + EVENT_RATE_LIMIT_MAX_REQUESTS + 1);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("allows requests again after the window expires", () => {
    resetEventRateLimitStore();
    const key = "127.0.0.1:sess_1";
    const now = Date.now();

    for (let index = 0; index < EVENT_RATE_LIMIT_MAX_REQUESTS; index += 1) {
      checkEventRateLimit(key, now + index);
    }

    const afterWindow = checkEventRateLimit(key, now + EVENT_RATE_LIMIT_WINDOW_MS + 1);
    expect(afterWindow.allowed).toBe(true);
  });
});
