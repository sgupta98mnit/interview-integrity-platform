import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

import { computeSimpleLineDiff } from "./diff";
import { computeReviewAnalysis } from "./scoring";
import type { ReviewFlag, ReviewMetrics } from "./types";

export type ReviewResponse = {
  session: {
    id: string;
    candidateName: string | null;
    candidateEmail: string | null;
    status: string;
    createdAt: string;
    submittedAt: string | null;
  };
  metrics: ReviewMetrics;
  flags: ReviewFlag[];
  events: Array<{
    id: string;
    sessionId: string;
    clientEventId: string;
    tsISO: string;
    type: string;
    metadata: unknown;
    createdAt: string;
  }>;
  snapshots: Array<{
    id: string;
    kind: string;
    language: string;
    tsISO: string;
    createdAt: string;
    code: string;
  }>;
  diffs: Array<{
    fromSnapshotId: string;
    toSnapshotId: string;
    fromKind: string;
    toKind: string;
    changes: ReturnType<typeof computeSimpleLineDiff>;
  }>;
  generatedAtISO: string;
};

function coerceMetrics(value: unknown): ReviewMetrics | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const metrics = value as Partial<ReviewMetrics>;
  if (
    typeof metrics.focusLossCount === "number" &&
    typeof metrics.hiddenCount === "number" &&
    typeof metrics.pasteCount === "number" &&
    typeof metrics.largePasteCount === "number" &&
    typeof metrics.avgTypingRate === "number" &&
    typeof metrics.longestIdleSec === "number" &&
    typeof metrics.bigEditCount === "number"
  ) {
    return metrics as ReviewMetrics;
  }

  return null;
}

function coerceFlags(value: unknown): ReviewFlag[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter((candidate): candidate is ReviewFlag => {
    if (typeof candidate !== "object" || candidate === null) {
      return false;
    }

    const flag = candidate as Partial<ReviewFlag>;
    return (
      typeof flag.code === "string" &&
      typeof flag.severity === "string" &&
      typeof flag.tsISO === "string" &&
      typeof flag.details === "object" &&
      flag.details !== null
    );
  });
}

export async function computeAndPersistReviewSummary(sessionId: string): Promise<{
  metrics: ReviewMetrics;
  flags: ReviewFlag[];
} | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      events: {
        orderBy: { tsISO: "asc" },
      },
    },
  });

  if (!session) {
    logger.warn("review_summary_missing_session", { sessionId });
    return null;
  }

  const analysis = computeReviewAnalysis(session.events);

  await prisma.reviewSummary.upsert({
    where: { sessionId },
    create: {
      sessionId,
      metrics: analysis.metrics as Prisma.InputJsonValue,
      flags: analysis.flags as unknown as Prisma.InputJsonValue,
    },
    update: {
      metrics: analysis.metrics as Prisma.InputJsonValue,
      flags: analysis.flags as unknown as Prisma.InputJsonValue,
      computedAt: new Date(),
    },
  });

  logger.info("review_summary_upserted", {
    sessionId,
    flagCount: analysis.flags.length,
  });

  return analysis;
}

export async function buildReviewResponse(sessionId: string): Promise<ReviewResponse | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      events: {
        orderBy: { tsISO: "asc" },
      },
      snapshots: {
        orderBy: { createdAt: "asc" },
      },
      reviewSummary: true,
    },
  });

  if (!session) {
    logger.warn("review_response_missing_session", { sessionId });
    return null;
  }

  const computed = computeReviewAnalysis(session.events);

  const metrics = coerceMetrics(session.reviewSummary?.metrics) ?? computed.metrics;
  const flags = coerceFlags(session.reviewSummary?.flags) ?? computed.flags;

  if (!session.reviewSummary) {
    await prisma.reviewSummary.create({
      data: {
        sessionId,
        metrics: metrics as Prisma.InputJsonValue,
        flags: flags as unknown as Prisma.InputJsonValue,
      },
    });
  }

  const diffs = [] as Array<{
    fromSnapshotId: string;
    toSnapshotId: string;
    fromKind: string;
    toKind: string;
    changes: ReturnType<typeof computeSimpleLineDiff>;
  }>;

  for (let index = 1; index < session.snapshots.length; index += 1) {
    const previous = session.snapshots[index - 1];
    const current = session.snapshots[index];

    diffs.push({
      fromSnapshotId: previous.id,
      toSnapshotId: current.id,
      fromKind: previous.kind,
      toKind: current.kind,
      changes: computeSimpleLineDiff(previous.code, current.code),
    });
  }

  return {
    session: {
      id: session.id,
      candidateName: session.candidateName,
      candidateEmail: session.candidateEmail,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      submittedAt: session.submittedAt?.toISOString() ?? null,
    },
    metrics,
    flags,
    events: session.events.map((event) => ({
      id: event.id,
      sessionId: event.sessionId,
      clientEventId: event.clientEventId,
      tsISO: event.tsISO.toISOString(),
      type: event.type,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
    })),
    snapshots: session.snapshots.map((snapshot) => ({
      id: snapshot.id,
      kind: snapshot.kind,
      language: snapshot.language,
      tsISO: snapshot.tsISO.toISOString(),
      createdAt: snapshot.createdAt.toISOString(),
      code: snapshot.code,
    })),
    diffs,
    generatedAtISO: new Date().toISOString(),
  };
}
