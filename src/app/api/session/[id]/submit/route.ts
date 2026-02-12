import { NextRequest, NextResponse } from "next/server";

import { submitSessionCode } from "@/features/coding/session-actions";
import { SESSION_TOKEN_COOKIE } from "@/features/session/constants";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  const result = await submitSessionCode({
    sessionId: id,
    rawToken: request.cookies.get(SESSION_TOKEN_COOKIE)?.value ?? null,
    body,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, issues: result.issues },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data);
}
