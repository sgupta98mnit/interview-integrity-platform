import { CodeLanguage, SnapshotKind, SessionStatus } from "@prisma/client";

import { computeAndPersistReviewSummary } from "@/features/review/summary";
import { authorizeSessionFromToken } from "@/features/session/auth";
import { prisma } from "@/lib/prisma";

import { evaluateCodeMock } from "./evaluate";
import { runOrSubmitSchema, type RunOrSubmitInput } from "./schema";

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 401 | 404; error: string; issues?: unknown };

type RunResponse = {
  tests: ReturnType<typeof evaluateCodeMock>;
  snapshotId: string;
};

type SubmitResponse = {
  submitted: true;
  snapshotId: string;
  reviewUrl: string;
};

function toCodeLanguage(language: RunOrSubmitInput["language"]): CodeLanguage {
  return language === "javascript" ? CodeLanguage.javascript : CodeLanguage.typescript;
}

async function ensureAuthorizedSession(sessionId: string, rawToken: string | null) {
  const authorized = await authorizeSessionFromToken({ sessionId, rawToken });
  if (!authorized) {
    return null;
  }

  return prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true },
  });
}

function parseBody(body: unknown) {
  const parsed = runOrSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "Invalid request",
      issues: parsed.error.flatten(),
    } as const;
  }

  return { ok: true, value: parsed.data } as const;
}

export async function runSessionCode({
  sessionId,
  rawToken,
  body,
}: {
  sessionId: string;
  rawToken: string | null;
  body: unknown;
}): Promise<ActionResult<RunResponse>> {
  const parsed = parseBody(body);
  if (!parsed.ok) {
    return parsed;
  }

  const session = await ensureAuthorizedSession(sessionId, rawToken);
  if (!session) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized session",
    };
  }

  const snapshot = await prisma.codeSnapshot.create({
    data: {
      sessionId,
      kind: SnapshotKind.RUN,
      code: parsed.value.code,
      language: toCodeLanguage(parsed.value.language),
      tsISO: new Date(),
    },
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { lastActivityAt: new Date() },
  });

  return {
    ok: true,
    data: {
      tests: evaluateCodeMock(parsed.value),
      snapshotId: snapshot.id,
    },
  };
}

export async function submitSessionCode({
  sessionId,
  rawToken,
  body,
}: {
  sessionId: string;
  rawToken: string | null;
  body: unknown;
}): Promise<ActionResult<SubmitResponse>> {
  const parsed = parseBody(body);
  if (!parsed.ok) {
    return parsed;
  }

  const session = await ensureAuthorizedSession(sessionId, rawToken);
  if (!session) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized session",
    };
  }

  const snapshot = await prisma.codeSnapshot.create({
    data: {
      sessionId,
      kind: SnapshotKind.SUBMIT,
      code: parsed.value.code,
      language: toCodeLanguage(parsed.value.language),
      tsISO: new Date(),
    },
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.SUBMITTED,
      submittedAt: new Date(),
      lastActivityAt: new Date(),
    },
  });

  await computeAndPersistReviewSummary(sessionId);

  return {
    ok: true,
    data: {
      submitted: true,
      snapshotId: snapshot.id,
      reviewUrl: `/review/${sessionId}`,
    },
  };
}
