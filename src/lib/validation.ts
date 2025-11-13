import { z } from "zod";

export const quizEventSchema = z.object({
  event_type: z.enum(["quiz_started", "quiz_completed"]),
  book_id: z.string().uuid(),
  age_band: z.enum(["easy", "medium", "hard"]).optional(),
  score: z.number().int().min(0).max(100).optional(),
  user_id: z.string().uuid().optional(),
});

export type QuizEvent = z.infer<typeof quizEventSchema>;
