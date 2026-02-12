import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ingestEventBatch } from "@/features/events/ingest";
import { checkEventRateLimit } from "@/features/events/rate-limit";
import { SESSION_TOKEN_COOKIE } from "@/features/session/constants";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsedSession = z
    .object({ sessionId: z.string().min(1) })
    .safeParse(body ?? {});

  if (parsedSession.success) {
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
    const key = `${ip}:${parsedSession.data.sessionId}`;
    const rateLimit = checkEventRateLimit(key);

    if (!rateLimit.allowed) {
      logger.warn("event_ingest_rate_limited", {
        sessionId: parsedSession.data.sessionId,
        ip,
        retryAfterSec: rateLimit.retryAfterSec,
      });
      return NextResponse.json(
        {
          error: "Too many event batches",
          retryAfterSec: rateLimit.retryAfterSec,
        },
        { status: 429 },
      );
    }
  }

  const result = await ingestEventBatch({
    body,
    rawToken: request.cookies.get(SESSION_TOKEN_COOKIE)?.value ?? null,
  });

  if (!result.ok) {
    logger.warn("event_ingest_rejected", {
      status: result.status,
      error: result.error,
      sessionId: parsedSession.success ? parsedSession.data.sessionId : null,
    });
    return NextResponse.json(
      {
        error: result.error,
        issues: result.issues?.flatten(),
      },
      { status: result.status },
    );
  }

  logger.info("event_ingest_success", {
    sessionId: parsedSession.success ? parsedSession.data.sessionId : null,
    ingestedCount: result.ingestedCount,
    droppedCount: result.droppedCount,
  });

  return NextResponse.json({
    ingestedCount: result.ingestedCount,
    droppedCount: result.droppedCount,
  });
}
