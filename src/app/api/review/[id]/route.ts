import { NextResponse } from "next/server";

import { buildReviewResponse } from "@/features/review/summary";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const review = await buildReviewResponse(id);

  if (!review) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(review);
}
