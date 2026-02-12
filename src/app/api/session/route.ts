import { NextResponse } from "next/server";

import { SESSION_TOKEN_COOKIE } from "@/features/session/constants";
import { createSessionSchema } from "@/features/session/schema";
import { newSessionNonce, signSessionToken } from "@/features/session/token";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSessionSchema.safeParse(body ?? {});

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const nonce = newSessionNonce();

  const session = await prisma.session.create({
    data: {
      candidateName: parsed.data.candidateName,
      candidateEmail: parsed.data.candidateEmail,
      tokenNonce: nonce,
    },
  });

  const token = signSessionToken({
    sessionId: session.id,
    nonce,
    iat: Date.now(),
  });

  const response = NextResponse.json({
    sessionId: session.id,
    sessionTokenSet: true,
    nextUrl: `/session/${session.id}`,
  });

  response.cookies.set({
    name: SESSION_TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
