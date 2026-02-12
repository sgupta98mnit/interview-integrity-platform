import { Prisma } from "@prisma/client";

import { SESSION_TOKEN_COOKIE } from "@/features/session/constants";
import { authorizeSessionFromToken } from "@/features/session/auth";
import { prisma } from "@/lib/prisma";

import { eventBatchSchema, type EventBatchInput } from "./schema";

type IngestResult =
  | { ok: true; ingestedCount: number; droppedCount: number }
  | {
      ok: false;
      status: 400 | 401;
      error: string;
      issues?: ReturnType<(typeof eventBatchSchema)["safeParse"]>["error"];
    };

function isUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002";
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    return (error as { code?: string }).code === "P2002";
  }

  return false;
}

async function persistEvents(input: EventBatchInput): Promise<{ ingestedCount: number; droppedCount: number }> {
  let ingestedCount = 0;
  let droppedCount = 0;

  for (const event of input.events) {
    try {
      await prisma.event.create({
        data: {
          sessionId: input.sessionId,
          clientEventId: event.clientEventId,
          tsISO: new Date(event.tsISO),
          type: event.type,
          metadata: event.metadata as Prisma.InputJsonValue,
        },
      });
      ingestedCount += 1;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        droppedCount += 1;
        continue;
      }

      throw error;
    }
  }

  return { ingestedCount, droppedCount };
}

export async function ingestEventBatch({
  body,
  rawToken,
}: {
  body: unknown;
  rawToken: string | null;
}): Promise<IngestResult> {
  const parsed = eventBatchSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "Invalid request",
      issues: parsed.error,
    };
  }

  const authorized = await authorizeSessionFromToken({
    sessionId: parsed.data.sessionId,
    rawToken,
  });

  if (!authorized) {
    return {
      ok: false,
      status: 401,
      error: `Invalid or missing ${SESSION_TOKEN_COOKIE}`,
    };
  }

  const { ingestedCount, droppedCount } = await persistEvents(parsed.data);

  return {
    ok: true,
    ingestedCount,
    droppedCount,
  };
}
