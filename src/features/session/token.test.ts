import { describe, expect, it } from "vitest";

import { signSessionToken, verifySessionToken } from "./token";

describe("session token", () => {
  it("signs and verifies payload", () => {
    const token = signSessionToken({
      sessionId: "sess_123",
      nonce: "nonce_abc",
      iat: Date.now(),
    });

    const parsed = verifySessionToken(token);

    expect(parsed?.sessionId).toBe("sess_123");
    expect(parsed?.nonce).toBe("nonce_abc");
  });

  it("rejects tampered tokens", () => {
    const token = signSessionToken({
      sessionId: "sess_123",
      nonce: "nonce_abc",
      iat: Date.now(),
    });

    const parsed = verifySessionToken(`${token}oops`);

    expect(parsed).toBeNull();
  });
});
