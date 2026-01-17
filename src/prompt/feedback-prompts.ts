import { Agent } from "../agents/agent";
import { ContextStore } from "../context/store";
import { promptLogger, logDataTransfer } from "../logger/enhanced-logger";

export function buildReviewPrompt(
  reviewer: Agent,
  context: ContextStore,
  branchOutputs: Map<string, { agentId: string; role: string; output: string }>,
  iteration: number,
  approvalKeyword: string
): { system: string; user: string } {
  promptLogger.info({
    event: "REVIEW_PROMPT_BUILD_START",
    agentId: reviewer.id,
    iteration,
    branchCount: branchOutputs.size,
  }, `🏗️ Building review prompt for ${reviewer.id} (iteration ${iteration})`);

  const systemPrompt = `
You are acting as: ${reviewer.role}

Your goal:
${reviewer.goal}

IMPORTANT REVIEW INSTRUCTIONS:
1. Review the outputs from all agents carefully
2. If everything is satisfactory and meets all requirements, respond with "${approvalKeyword}" at the very start of your response
3. If changes are needed, provide specific, actionable feedback for each agent
4. Format your feedback clearly with agent names/roles followed by specific suggestions
5. Be constructive and specific - point out what needs to change and why

Iteration: ${iteration}
${iteration > 1 ? 'This is a revision. Check if previous feedback has been addressed.' : 'This is the initial review.'}
`.trim();

  let userPrompt = `User Request:\n${context.userInput}\n\n`;

  userPrompt += `Agent Outputs to Review:\n\n`;

  for (const [agentId, data] of branchOutputs.entries()) {
    userPrompt += `--- ${data.role} (${agentId}) ---\n`;
    userPrompt += `${data.output}\n\n`;
  }

  if (iteration > 1) {
    userPrompt += `\n⚠️ This is revision iteration ${iteration}. Please check if your previous feedback has been adequately addressed.\n`;
  }

  promptLogger.info({
    event: "REVIEW_PROMPT_COMPLETE",
    agentId: reviewer.id,
    iteration,
    systemLength: systemPrompt.length,
    userLength: userPrompt.length,
  }, `✅ Review prompt built for iteration ${iteration}`);

  logDataTransfer(
    "BranchOutputs",
    `ReviewPrompt->${reviewer.id}`,
    { iteration, branchCount: branchOutputs.size },
    "explicit"
  );

  return { system: systemPrompt, user: userPrompt };
}

export function buildRevisionPrompt(
  agent: Agent,
  context: ContextStore,
  previousOutput: string,
  feedback: string,
  iteration: number
): { system: string; user: string } {
  promptLogger.info({
    event: "REVISION_PROMPT_BUILD_START",
    agentId: agent.id,
    iteration,
    feedbackLength: feedback.length,
  }, `🔄 Building revision prompt for ${agent.id} (iteration ${iteration})`);

  const systemPrompt = `
You are acting as: ${agent.role}

Your goal:
${agent.goal}

IMPORTANT REVISION INSTRUCTIONS:
- You are revising your previous work based on reviewer feedback
- Carefully incorporate ALL the feedback provided
- Maintain the good aspects of your previous output
- Address ALL concerns raised by the reviewer
- Improve quality and completeness

Revision Iteration: ${iteration}
`.trim();

  const userPrompt = `
Original Request:
${context.userInput}

Your Previous Output:
${previousOutput}

Reviewer Feedback for You:
${feedback}

Please revise your output to fully address the reviewer's feedback while maintaining quality.
`.trim();

  promptLogger.info({
    event: "REVISION_PROMPT_COMPLETE",
    agentId: agent.id,
    iteration,
    systemLength: systemPrompt.length,
    userLength: userPrompt.length,
  }, `✅ Revision prompt built for iteration ${iteration}`);

  logDataTransfer(
    "ReviewerFeedback",
    `RevisionPrompt->${agent.id}`,
    { iteration, feedbackLength: feedback.length },
    "explicit"
  );

  return { system: systemPrompt, user: userPrompt };
}
