export type ReviewMetrics = {
  focusLossCount: number;
  hiddenCount: number;
  pasteCount: number;
  largePasteCount: number;
  avgTypingRate: number;
  longestIdleSec: number;
  bigEditCount: number;
};

export type ReviewFlag = {
  code:
    | "FOCUS_LOSS_SPIKE"
    | "LARGE_PASTE"
    | "BIG_EDIT_NO_TYPING"
    | "FULLSCREEN_EXIT"
    | "LONG_IDLE";
  severity: "low" | "medium" | "high";
  tsISO: string;
  details: Record<string, unknown>;
};
