import { z } from "zod";

export const createReviewSchema = z.object({
  userId: z.number().int().positive("User ID must be a positive integer"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().min(1, "Comment is required").max(1000, "Comment must not exceed 1000 characters"),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
