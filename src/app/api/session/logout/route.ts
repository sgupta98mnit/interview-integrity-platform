import { NextResponse } from "next/server";

import { SESSION_TOKEN_COOKIE } from "@/features/session/constants";

export async function POST() {
  const response = NextResponse.json({
    loggedOut: true,
    nextUrl: "/start",
  });

  response.cookies.set({
    name: SESSION_TOKEN_COOKIE,
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  return response;
}
