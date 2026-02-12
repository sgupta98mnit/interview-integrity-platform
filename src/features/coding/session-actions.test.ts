import { SnapshotKind } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authorizeSessionFromToken,
  sessionFindUnique,
  sessionUpdate,
  codeSnapshotCreate,
  computeAndPersistReviewSummary,
} = vi.hoisted(() => ({
  authorizeSessionFromToken: vi.fn(),
  sessionFindUnique: vi.fn(),
  sessionUpdate: vi.fn(),
  codeSnapshotCreate: vi.fn(),
  computeAndPersistReviewSummary: vi.fn(),
}));

vi.mock("@/features/session/auth", () => ({
  authorizeSessionFromToken,
}));

vi.mock("@/features/review/summary", () => ({
  computeAndPersistReviewSummary,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findUnique: sessionFindUnique,
      update: sessionUpdate,
    },
    codeSnapshot: {
      create: codeSnapshotCreate,
    },
  },
}));

import { runSessionCode, submitSessionCode } from "./session-actions";

describe("session actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("runs tests and stores RUN snapshot", async () => {
    authorizeSessionFromToken.mockResolvedValue(true);
    sessionFindUnique.mockResolvedValue({ id: "sess_1" });
    codeSnapshotCreate.mockResolvedValue({ id: "snap_run_1" });

    const result = await runSessionCode({
      sessionId: "sess_1",
      rawToken: "token",
      body: {
        code: "function solve(){ return null; }",
        language: "typescript",
      },
    });

    expect(result.ok).toBe(true);
    expect(codeSnapshotCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: SnapshotKind.RUN,
        }),
      }),
    );
  });

  it("submits and updates session status", async () => {
    authorizeSessionFromToken.mockResolvedValue(true);
    sessionFindUnique.mockResolvedValue({ id: "sess_1" });
    codeSnapshotCreate.mockResolvedValue({ id: "snap_submit_1" });
    sessionUpdate.mockResolvedValue({});
    computeAndPersistReviewSummary.mockResolvedValue({});

    const result = await submitSessionCode({
      sessionId: "sess_1",
      rawToken: "token",
      body: {
        code: "function solve(){ return [0,1]; }",
        language: "javascript",
      },
    });

    expect(result).toEqual({
      ok: true,
      data: {
        submitted: true,
        snapshotId: "snap_submit_1",
        reviewUrl: "/review/sess_1",
      },
    });
    expect(sessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SUBMITTED",
        }),
      }),
    );
    expect(computeAndPersistReviewSummary).toHaveBeenCalledWith("sess_1");
  });

  it("rejects unauthorized run", async () => {
    authorizeSessionFromToken.mockResolvedValue(false);

    const result = await runSessionCode({
      sessionId: "sess_1",
      rawToken: "token",
      body: {
        code: "function solve(){ return null; }",
        language: "typescript",
      },
    });

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Unauthorized session",
    });
  });
});
