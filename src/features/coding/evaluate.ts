import type { RunOrSubmitInput } from "./schema";

export type MockTestResult = {
  name: string;
  passed: boolean;
  message: string;
};

export function evaluateCodeMock(input: RunOrSubmitInput): MockTestResult[] {
  const code = input.code;

  const hasFunction = /function\s+solve/.test(code);
  const hasReturn = /return\s+/.test(code);
  const hasPairLogic = /target/.test(code) && /nums/.test(code);

  return [
    {
      name: "exports solve function",
      passed: hasFunction,
      message: hasFunction ? "Found solve function signature." : "Missing solve function.",
    },
    {
      name: "returns a value",
      passed: hasReturn,
      message: hasReturn ? "Return statement detected." : "No return statement found.",
    },
    {
      name: "references target and nums",
      passed: hasPairLogic,
      message: hasPairLogic
        ? "Basic two-sum variable usage detected."
        : "Expected target/nums logic not found.",
    },
  ];
}
