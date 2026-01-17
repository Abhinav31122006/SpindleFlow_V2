import { z } from "zod";

export const FeedbackLoopSchema = z.object({
  enabled: z.boolean(),
  max_iterations: z.number().min(1).max(10).default(5),
  approval_keyword: z.string().default("APPROVED"),
  feedback_targets: z.array(z.string().min(1)).min(1),
});

export type FeedbackLoopConfig = z.infer<typeof FeedbackLoopSchema>;

export interface FeedbackIteration {
  iteration: number;
  reviewerOutput: string;
  approved: boolean;
  timestamp: number;
  feedback?: Map<string, string>;
}

export interface FeedbackResult {
  isApproved: boolean;
  feedback: Map<string, string>; // agentId -> specific feedback
  iteration: number;
}
