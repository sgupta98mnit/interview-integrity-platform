export type DiffChange = {
  type: "add" | "remove" | "context";
  line: string;
};

export function computeSimpleLineDiff(beforeCode: string, afterCode: string): DiffChange[] {
  const beforeLines = beforeCode.split("\n");
  const afterLines = afterCode.split("\n");
  const max = Math.max(beforeLines.length, afterLines.length);
  const changes: DiffChange[] = [];

  for (let index = 0; index < max; index += 1) {
    const before = beforeLines[index];
    const after = afterLines[index];

    if (before === after && before !== undefined) {
      changes.push({ type: "context", line: before });
      continue;
    }

    if (before !== undefined) {
      changes.push({ type: "remove", line: before });
    }

    if (after !== undefined) {
      changes.push({ type: "add", line: after });
    }
  }

  return changes;
}
