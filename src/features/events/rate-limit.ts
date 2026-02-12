import {
  EVENT_RATE_LIMIT_MAX_REQUESTS,
  EVENT_RATE_LIMIT_WINDOW_MS,
} from "@/config/integrity";

type Bucket = {
  timestamps: number[];
};

const buckets = new Map<string, Bucket>();

export function checkEventRateLimit(
  key: string,
  nowMs = Date.now(),
): { allowed: boolean; retryAfterSec: number } {
  const bucket = buckets.get(key) ?? { timestamps: [] };

  bucket.timestamps = bucket.timestamps.filter(
    (timestamp) => nowMs - timestamp < EVENT_RATE_LIMIT_WINDOW_MS,
  );

  if (bucket.timestamps.length >= EVENT_RATE_LIMIT_MAX_REQUESTS) {
    const oldest = bucket.timestamps[0] ?? nowMs;
    const retryAfterSec = Math.ceil(
      (EVENT_RATE_LIMIT_WINDOW_MS - (nowMs - oldest)) / 1000,
    );
    buckets.set(key, bucket);
    return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
  }

  bucket.timestamps.push(nowMs);
  buckets.set(key, bucket);
  return { allowed: true, retryAfterSec: 0 };
}

export function resetEventRateLimitStore() {
  buckets.clear();
}
