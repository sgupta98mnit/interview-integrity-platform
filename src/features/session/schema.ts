import { z } from "zod";

export const createSessionSchema = z.object({
  candidateName: z.string().trim().min(1).max(120).optional(),
  candidateEmail: z.email().optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
