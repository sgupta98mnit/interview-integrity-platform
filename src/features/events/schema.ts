import { z } from "zod";

export const integrityEventTypeSchema = z.enum([
  "FOCUS_LOSS",
  "FOCUS_GAIN",
  "PAGE_HIDDEN",
  "PAGE_VISIBLE",
  "FULLSCREEN_ENTER",
  "FULLSCREEN_EXIT",
  "CLIPBOARD_COPY",
  "CLIPBOARD_CUT",
  "CLIPBOARD_PASTE",
  "PASTE_ANALYZED",
  "TYPING_BUCKET",
  "IDLE",
  "EDITOR_CHANGE",
  "SESSION_SUBMIT",
]);

const integrityEventSchema = z.object({
  clientEventId: z.string().min(1).max(120),
  tsISO: z.iso.datetime(),
  type: integrityEventTypeSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const eventBatchSchema = z.object({
  sessionId: z.string().min(1),
  events: z.array(integrityEventSchema).min(1).max(200),
});

export type EventBatchInput = z.infer<typeof eventBatchSchema>;
export type IntegrityEventInput = z.infer<typeof integrityEventSchema>;
