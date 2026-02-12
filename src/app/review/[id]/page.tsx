import { notFound } from "next/navigation";

import { buildReviewResponse } from "@/features/review/summary";

import { ReviewPageClient } from "./review-page-client";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const review = await buildReviewResponse(id);

  if (!review) {
    notFound();
  }

  return <ReviewPageClient review={review} />;
}
