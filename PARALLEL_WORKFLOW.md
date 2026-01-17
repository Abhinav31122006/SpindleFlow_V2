Correction 2: Parallel Workflow Feedback Loop
Problem Statement
Current parallel workflow is one-way:

Backend & Frontend → Reviewer (end)

Required workflow is iterative:

Backend & Frontend → Reviewer
Reviewer → Backend & Frontend (with feedback)
Backend & Frontend → Reviewer (with revisions)
Loop continues until Reviewer approves

Current Implementation Issues
In src/orchestrator/parallel.ts
typescript// ❌ WRONG: One-way flow
const branchResults = await Promise.all(branchPromises);
const finalOutput = await llm.generate(finalPrompt);  // Ends here
Solution Architecture
1. Feedback Loop Configuration
Extend YAML schema to support feedback loops:
yamlworkflow:
  type: parallel
  branches:
    - backend
    - frontend
  
  then:
    agent: reviewer
    feedback_loop:
      enabled: true
      max_iterations: 5           # Prevent infinite loops
      approval_keyword: "APPROVED" # Keyword in reviewer output
      feedback_targets:            # Which agents get feedback
        - backend
        - frontend
2. New Schema Types
Create src/config/feedback-schema.ts:
typescriptimport { z } from "zod";

export const FeedbackLoopSchema = z.object({
  enabled: z.boolean(),
  max_iterations: z.number().min(1).max(10).default(5),
  approval_keyword: z.string().default("APPROVED"),
  feedback_targets: z.array(z.string()).min(1)
});

export const ParallelWorkflowSchemaV2 = z.object({
  type: z.literal("parallel"),
  branches: z.array(z.string().min(1)).min(1),
  then: z.object({
    agent: z.string().min(1),
    feedback_loop: FeedbackLoopSchema.optional()
  })
});

export type FeedbackLoopConfig = z.infer<typeof FeedbackLoopSchema>;
3. Feedback Processor
Create src/orchestrator/feedback-processor.ts:
typescriptexport interface FeedbackResult {
  isApproved: boolean;
  feedback: Map<string, string>; // agentId -> specific feedback
  iteration: number;
}

export class FeedbackProcessor {
  /**
   * Analyzes reviewer output to extract:
   * 1. Approval status
   * 2. Agent-specific feedback
   */
  processFeedback(
    reviewerOutput: string,
    targetAgents: string[],
    approvalKeyword: string
  ): FeedbackResult {
    
    const isApproved = reviewerOutput
      .toUpperCase()
      .includes(approvalKeyword.toUpperCase());
    
    const feedback = this.extractAgentFeedback(
      reviewerOutput, 
      targetAgents
    );
    
    return { isApproved, feedback, iteration: 0 };
  }
  
  private extractAgentFeedback(
    output: string,
    agents: string[]
  ): Map<string, string> {
    // Use regex or LLM to extract feedback per agent
    // Look for patterns like:
    // "Backend: Please fix X"
    // "Frontend: Improve Y"
  }
}
4. Iterative Parallel Orchestrator
Create src/orchestrator/parallel-iterative.ts:
typescriptexport async function runIterativeParallelWorkflow(params: {
  branches: string[];
  then: { agent: string; feedback_loop: FeedbackLoopConfig };
  registry: AgentRegistry;
  context: ContextStore;
  llm: LLMProvider;
}) {
  const { branches, then, registry, context, llm } = params;
  const config = then.feedback_loop;
  
  let iteration = 0;
  let approved = false;
  const feedbackProcessor = new FeedbackProcessor();
  
  // Initial execution
  const branchOutputs = await executeParallelBranches(
    branches, registry, context, llm
  );
  
  while (!approved && iteration < config.max_iterations) {
    iteration++;
    
    console.log(`\n🔄 Feedback Iteration ${iteration}/${config.max_iterations}`);
    
    // Run reviewer/aggregator
    const reviewerAgent = registry.getAgent(then.agent);
    const reviewPrompt = buildReviewPrompt(
      reviewerAgent,
      context,
      branchOutputs,
      iteration
    );
    
    const reviewOutput = await llm.generate(reviewPrompt);
    
    // Process feedback
    const feedbackResult = feedbackProcessor.processFeedback(
      reviewOutput,
      config.feedback_targets,
      config.approval_keyword
    );
    
    // Store reviewer output
    context.setOutput(then.agent, reviewOutput);
    context.addFeedbackIteration({
      iteration,
      reviewerOutput: reviewOutput,
      approved: feedbackResult.isApproved
    });
    
    if (feedbackResult.isApproved) {
      approved = true;
      console.log(`✅ Approved after ${iteration} iteration(s)`);
      break;
    }
    
    // Not approved - send feedback to agents
    console.log(`📝 Sending feedback to ${config.feedback_targets.length} agents`);
    
    const revisedOutputs = await executeRevisions(
      config.feedback_targets,
      feedbackResult.feedback,
      branchOutputs,
      registry,
      context,
      llm,
      iteration
    );
    
    branchOutputs = revisedOutputs;
  }
  
  if (!approved) {
    console.log(`⚠️  Max iterations (${config.max_iterations}) reached without approval`);
  }
  
  return {
    approved,
    iterations: iteration,
    finalOutputs: branchOutputs
  };
}
5. Revision Execution
typescriptasync function executeRevisions(
  targetAgents: string[],
  feedback: Map<string, string>,
  previousOutputs: Map<string, string>,
  registry: AgentRegistry,
  context: ContextStore,
  llm: LLMProvider,
  iteration: number
): Promise<Map<string, string>> {
  
  const revisionPromises = targetAgents.map(async (agentId) => {
    const agent = registry.getAgent(agentId);
    const agentFeedback = feedback.get(agentId) || "No specific feedback";
    const previousOutput = previousOutputs.get(agentId) || "";
    
    const revisionPrompt = buildRevisionPrompt(
      agent,
      context,
      previousOutput,
      agentFeedback,
      iteration
    );
    
    console.log(`  🔄 ${agentId}: Incorporating feedback...`);
    
    const revisedOutput = await llm.generate(revisionPrompt);
    
    // Store revision in context
    context.setRevision(agentId, iteration, revisedOutput);
    
    return { agentId, output: revisedOutput };
  });
  
  const revisions = await Promise.all(revisionPromises);
  
  const revisedOutputs = new Map<string, string>();
  revisions.forEach(r => revisedOutputs.set(r.agentId, r.output));
  
  return revisedOutputs;
}
6. Specialized Prompts
Create src/prompt/feedback-prompts.ts:
typescriptexport function buildReviewPrompt(
  reviewer: Agent,
  context: ContextStore,
  branchOutputs: Map<string, string>,
  iteration: number
): { system: string; user: string } {
  
  const systemPrompt = `
You are: ${reviewer.role}

Your goal: ${reviewer.goal}

IMPORTANT INSTRUCTIONS:
1. Review the outputs from all agents carefully
2. If everything is satisfactory, respond with "APPROVED" at the start
3. If changes are needed, provide specific feedback for each agent
4. Format feedback as:
   Backend: [specific feedback]
   Frontend: [specific feedback]

Iteration: ${iteration}
`.trim();

  let userPrompt = `User Request: ${context.userInput}\n\n`;
  
  userPrompt += `Agent Outputs to Review:\n`;
  for (const [agentId, output] of branchOutputs.entries()) {
    userPrompt += `\n--- ${agentId} ---\n${output}\n`;
  }
  
  if (iteration > 1) {
    userPrompt += `\n(This is revision iteration ${iteration})`;
  }
  
  return { system: systemPrompt, user: userPrompt };
}

export function buildRevisionPrompt(
  agent: Agent,
  context: ContextStore,
  previousOutput: string,
  feedback: string,
  iteration: number
): { system: string; user: string } {
  
  const systemPrompt = `
You are: ${agent.role}

Your goal: ${agent.goal}

IMPORTANT: You are revising your previous work based on reviewer feedback.
- Incorporate the feedback carefully
- Maintain good aspects of your previous output
- Address all concerns raised

Iteration: ${iteration}
`.trim();

  const userPrompt = `
Original Request: ${context.userInput}

Your Previous Output:
${previousOutput}

Reviewer Feedback:
${feedback}

Please revise your output to address the feedback.
`.trim();

  return { system: systemPrompt, user: userPrompt };
}
Implementation Strategy
Phase 1: Schema Extension (Day 1)

Update schema files

Add FeedbackLoopSchema
Modify ParallelWorkflowSchema
Update validators


Create example configs

yaml   # configs/demo-parallel-feedback.yml
   agents:
     - id: backend
       role: Backend Developer
       goal: Design REST API
     
     - id: frontend
       role: Frontend Developer
       goal: Design UI components
     
     - id: reviewer
       role: Technical Reviewer
       goal: Review and provide feedback until standards met
   
   workflow:
     type: parallel
     branches:
       - backend
       - frontend
     then:
       agent: reviewer
       feedback_loop:
         enabled: true
         max_iterations: 3
         approval_keyword: "APPROVED"
         feedback_targets:
           - backend
           - frontend
Phase 2: Feedback Processor (Day 2)

Implement feedback extraction

Approval detection
Agent-specific feedback parsing
Handle edge cases


Test feedback parsing

Various reviewer output formats
Approval variations
Missing feedback handling



Phase 3: Iterative Orchestrator (Day 3-4)

Create parallel-iterative.ts

Loop control logic
Iteration tracking
Convergence detection


Implement revision execution

Parallel revision processing
Context updates
Timeline tracking


Add iteration limits

Max iteration safety
Timeout handling
Progress logging



Phase 4: Prompt Templates (Day 5)

Review prompt template

Clear approval instructions
Structured feedback format
Iteration awareness


Revision prompt template

Previous output context
Specific feedback
Iteration tracking



Phase 5: Context Store Enhancement (Day 6)
Extend src/context/store.ts:
typescriptexport class ContextStore {
  private feedbackIterations: FeedbackIteration[] = [];
  private revisions: Map<string, Map<number, string>> = new Map();
  
  addFeedbackIteration(iteration: FeedbackIteration) {
    this.feedbackIterations.push(iteration);
  }
  
  setRevision(agentId: string, iteration: number, output: string) {
    if (!this.revisions.has(agentId)) {
      this.revisions.set(agentId, new Map());
    }
    this.revisions.get(agentId)!.set(iteration, output);
  }
  
  getIterationHistory(): FeedbackIteration[] {
    return this.feedbackIterations;
  }
}

interface FeedbackIteration {
  iteration: number;
  reviewerOutput: string;
  approved: boolean;
  timestamp: number;
}
Phase 6: Integration & Testing (Day 7)

Wire up to engine.ts

typescript   // In src/orchestrator/engine.ts
   if (config.workflow.type === "parallel") {
     if (config.workflow.then.feedback_loop?.enabled) {
       await runIterativeParallelWorkflow(params);
     } else {
       await runParallelWorkflow(params);
     }
   }

Create test scenarios

Immediate approval
2-3 iterations to approval
Max iterations reached
Edge cases



Console Output Enhancement
typescript// In src/reporter/console.ts

export function printFeedbackIteration(iteration: number, maxIterations: number) {
  console.log(`\n${"═".repeat(80)}`);
  console.log(`🔄 FEEDBACK ITERATION ${iteration}/${maxIterations}`);
  console.log(`${"═".repeat(80)}\n`);
}

export function printFeedbackSummary(agentId: string, feedback: string) {
  console.log(`  📝 Feedback for ${agentId}:`);
  console.log(`     ${feedback.split('\n').join('\n     ')}`);
}

export function printApprovalStatus(approved: boolean, iteration: number) {
  if (approved) {
    console.log(`\n  ✅ APPROVED after ${iteration} iteration(s)\n`);
  } else {
    console.log(`\n  ⏭️  Proceeding to next iteration...\n`);
  }
}
Benefits
✅ Iterative Refinement: Outputs improve through feedback
✅ Quality Control: Reviewer ensures standards met
✅ Flexible: Configurable iterations and approval criteria
✅ Auditable: Full iteration history tracked
✅ Realistic: Mimics real team workflows
✅ Safe: Max iteration limits prevent infinite loops
Example Workflow Output
🚀 WORKFLOW EXECUTION
═══════════════════════════════════════════════════════════

┌─ PARALLEL EXECUTION ─────────────────────────────────┐
  ⚡ Running: backend, frontend
  ✓ backend completed (1.2s)
  ✓ frontend completed (1.5s)
└──────────────────────────────────────────────────────┘

┌─ REVIEW ITERATION 1/3 ──────────────────────────────┐
  📝 reviewer analyzing outputs...
  ❌ NOT APPROVED
  
  📝 Feedback for backend:
     API endpoints need versioning (/v1/)
  
  📝 Feedback for frontend:
     Add loading states to components
└──────────────────────────────────────────────────────┘

┌─ REVISIONS (Iteration 1) ────────────────────────────┐
  🔄 backend: Incorporating feedback...
  🔄 frontend: Incorporating feedback...
  ✓ Revisions complete
└──────────────────────────────────────────────────────┘

┌─ REVIEW ITERATION 2/3 ──────────────────────────────┐
  📝 reviewer analyzing outputs...
  ✅ APPROVED
└──────────────────────────────────────────────────────┘

Final Status: Approved after 2 iterations
File Structure
src/
├── config/
│   └── feedback-schema.ts       # NEW: Feedback loop types
├── orchestrator/
│   ├── parallel-iterative.ts    # NEW: Iterative workflow
│   └── feedback-processor.ts    # NEW: Feedback extraction
├── prompt/
│   └── feedback-prompts.ts      # NEW: Review/revision prompts
└── context/
    └── store.ts                 # Enhanced with iterations
Success Metrics

 Feedback loop converges in <5 iterations
 Reviewer consistently detects issues
 Agents successfully incorporate feedback
 Full iteration history auditable
 Works with any number of branch agents
 No infinite loops (max iteration works)

Estimated Effort

Development: 5-7 days
Testing: 2-3 days
Documentation: 1-2 days
Total: ~2 weeks