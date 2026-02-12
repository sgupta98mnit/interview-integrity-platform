import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, verifySessionToken } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  verifySessionToken: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique,
    },
  },
}));

vi.mock("./token", () => ({
  verifySessionToken,
}));

import { authorizeSessionFromToken } from "./auth";

describe("authorizeSessionFromToken", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns false for missing token", async () => {
    const result = await authorizeSessionFromToken({
      sessionId: "sess_1",
      rawToken: null,
    });

    expect(result).toBe(false);
  });

  it("returns false when token session id does not match", async () => {
    verifySessionToken.mockReturnValue({
      sessionId: "sess_other",
      nonce: "nonce_1",
      iat: Date.now(),
    });

    const result = await authorizeSessionFromToken({
      sessionId: "sess_1",
      rawToken: "token",
    });

    expect(result).toBe(false);
  });

  it("returns false when nonce mismatches", async () => {
    verifySessionToken.mockReturnValue({
      sessionId: "sess_1",
      nonce: "nonce_bad",
      iat: Date.now(),
    });
    findUnique.mockResolvedValue({ tokenNonce: "nonce_ok" });

    const result = await authorizeSessionFromToken({
      sessionId: "sess_1",
      rawToken: "token",
    });

    expect(result).toBe(false);
  });

  it("returns true when token and nonce match", async () => {
    verifySessionToken.mockReturnValue({
      sessionId: "sess_1",
      nonce: "nonce_ok",
      iat: Date.now(),
    });
    findUnique.mockResolvedValue({ tokenNonce: "nonce_ok" });

    const result = await authorizeSessionFromToken({
      sessionId: "sess_1",
      rawToken: "token",
    });

    expect(result).toBe(true);
  });
});
