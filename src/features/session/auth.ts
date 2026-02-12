import { prisma } from "@/lib/prisma";

import { verifySessionToken } from "./token";

export async function authorizeSessionFromToken({
  sessionId,
  rawToken,
}: {
  sessionId: string;
  rawToken: string | null;
}): Promise<boolean> {
  if (!rawToken) {
    return false;
  }

  const token = verifySessionToken(rawToken);
  if (!token || token.sessionId !== sessionId) {
    return false;
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { tokenNonce: true },
  });

  if (!session) {
    return false;
  }

  return token.nonce === session.tokenNonce;
}
