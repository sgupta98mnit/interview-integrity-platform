import { describe, expect, it } from "vitest";

import { APP_NAME } from "./health";

describe("health", () => {
  it("exposes the app name", () => {
    expect(APP_NAME).toBe("Interview Integrity Platform");
  });
});
