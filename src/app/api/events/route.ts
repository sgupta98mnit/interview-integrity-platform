import { NextRequest, NextResponse } from "next/server";

import { ingestEventBatch } from "@/features/events/ingest";
import { SESSION_TOKEN_COOKIE } from "@/features/session/constants";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const result = await ingestEventBatch({
    body,
    rawToken: request.cookies.get(SESSION_TOKEN_COOKIE)?.value ?? null,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        issues: result.issues?.flatten(),
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ingestedCount: result.ingestedCount,
    droppedCount: result.droppedCount,
  });
}
