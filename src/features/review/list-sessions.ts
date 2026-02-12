import { prisma } from "@/lib/prisma";

export type ReviewSessionListItem = {
  id: string;
  candidateName: string | null;
  candidateEmail: string | null;
  status: string;
  createdAtISO: string;
  submittedAtISO: string | null;
  eventCount: number;
  snapshotCount: number;
  flagCount: number;
};

function readFlagCount(rawFlags: unknown): number {
  if (!Array.isArray(rawFlags)) {
    return 0;
  }

  return rawFlags.length;
}

export async function listSessionsForReview(): Promise<ReviewSessionListItem[]> {
  const sessions = await prisma.session.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          events: true,
          snapshots: true,
        },
      },
      reviewSummary: {
        select: {
          flags: true,
        },
      },
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    candidateName: session.candidateName,
    candidateEmail: session.candidateEmail,
    status: session.status,
    createdAtISO: session.createdAt.toISOString(),
    submittedAtISO: session.submittedAt?.toISOString() ?? null,
    eventCount: session._count.events,
    snapshotCount: session._count.snapshots,
    flagCount: readFlagCount(session.reviewSummary?.flags),
  }));
}
