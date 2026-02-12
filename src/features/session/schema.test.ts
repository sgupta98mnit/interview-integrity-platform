import { describe, expect, it } from "vitest";

import { createSessionSchema } from "./schema";

describe("createSessionSchema", () => {
  it("accepts optional fields", () => {
    const result = createSessionSchema.safeParse({
      candidateName: "Jane",
      candidateEmail: "jane@example.com",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = createSessionSchema.safeParse({
      candidateEmail: "not-email",
    });

    expect(result.success).toBe(false);
  });
});
