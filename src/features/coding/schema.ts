import { z } from "zod";

export const runOrSubmitSchema = z.object({
  code: z.string().min(1).max(20000),
  language: z.enum(["javascript", "typescript"]),
});

export type RunOrSubmitInput = z.infer<typeof runOrSubmitSchema>;
