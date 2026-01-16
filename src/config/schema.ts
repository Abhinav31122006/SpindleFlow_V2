import { z } from "zod";

export const AgentSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  goal: z.string().min(1),
  tools: z.array(z.string()).optional(),
});

const SequentialWorkflowSchema = z.object({
  type: z.literal("sequential"),
  steps: z.array(
    z.object({
      agent: z.string().min(1),
    })
  ),
});

const ParallelWorkflowSchema = z.object({
  type: z.literal("parallel"),
  branches: z.array(z.string().min(1)).min(1),
  then: z.object({
    agent: z.string().min(1),
  }),
});

export const WorkflowSchema = z.discriminatedUnion("type", [
  SequentialWorkflowSchema,
  ParallelWorkflowSchema,
]);

export const RootConfigSchema = z.object({
  agents: z.array(AgentSchema).min(1),
  workflow: WorkflowSchema,
});

export type RootConfig = z.infer<typeof RootConfigSchema>;
