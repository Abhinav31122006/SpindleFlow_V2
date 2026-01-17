import { FeedbackResult } from "../config/feedback-schema";
import { orchestratorLogger } from "../logger/enhanced-logger";

export class FeedbackProcessor {
  /**
   * Analyzes reviewer output to extract:
   * 1. Approval status
   * 2. Agent-specific feedback
   */
  processFeedback(
    reviewerOutput: string,
    targetAgents: string[],
    approvalKeyword: string,
    iteration: number
  ): FeedbackResult {
    orchestratorLogger.info({
      event: "FEEDBACK_PROCESSING_START",
      iteration,
      approvalKeyword,
      targetAgents,
    }, `🔍 Processing feedback from reviewer (iteration ${iteration})`);

    // Check for approval
    const isApproved = this.checkApproval(reviewerOutput, approvalKeyword);

    orchestratorLogger.info({
      event: "APPROVAL_CHECK",
      iteration,
      isApproved,
    }, isApproved ? `✅ Output APPROVED` : `📝 Revisions needed`);

    // Extract agent-specific feedback
    const feedback = this.extractAgentFeedback(reviewerOutput, targetAgents);

    orchestratorLogger.info({
      event: "FEEDBACK_EXTRACTED",
      iteration,
      feedbackCount: feedback.size,
      agents: Array.from(feedback.keys()),
    }, `📋 Extracted feedback for ${feedback.size} agents`);

    return { 
      isApproved, 
      feedback, 
      iteration 
    };
  }

  private checkApproval(output: string, keyword: string): boolean {
    // Check if approval keyword appears (case-insensitive)
    const upperOutput = output.toUpperCase();
    const upperKeyword = keyword.toUpperCase();

    // Check for exact match or common variations
    return (
      upperOutput.includes(upperKeyword) ||
      upperOutput.includes(`✅ ${upperKeyword}`) ||
      upperOutput.includes(`STATUS: ${upperKeyword}`) ||
      upperOutput.match(new RegExp(`^${upperKeyword}`, 'mi')) !== null
    );
  }

  private extractAgentFeedback(
    output: string,
    agents: string[]
  ): Map<string, string> {
    const feedback = new Map<string, string>();

    for (const agentId of agents) {
      const agentFeedback = this.extractFeedbackForAgent(output, agentId);
      if (agentFeedback) {
        feedback.set(agentId, agentFeedback);
        
        orchestratorLogger.debug({
          event: "AGENT_FEEDBACK_FOUND",
          agentId,
          feedbackLength: agentFeedback.length,
        }, `  📝 Found feedback for ${agentId}`);
      }
    }

    // If no specific feedback found but not approved, provide generic feedback
    if (feedback.size === 0) {
      for (const agentId of agents) {
        feedback.set(agentId, "Please review and improve based on the reviewer's comments above.");
        
        orchestratorLogger.debug({
          event: "GENERIC_FEEDBACK",
          agentId,
        }, `  ℹ️  Using generic feedback for ${agentId}`);
      }
    }

    return feedback;
  }

  private extractFeedbackForAgent(output: string, agentId: string): string | null {
    // Try multiple patterns to extract feedback

    // Pattern 1: "AgentId: feedback text"
    const pattern1 = new RegExp(
      `${agentId}\\s*:\\s*([^\\n]+(?:\\n(?!\\w+:)[^\\n]+)*)`,
      'i'
    );
    const match1 = output.match(pattern1);
    if (match1) {
      return match1[1].trim();
    }

    // Pattern 2: "**AgentId**: feedback text" or "## AgentId"
    const pattern2 = new RegExp(
      `(?:\\*\\*|##)\\s*${agentId}\\s*(?:\\*\\*|:)?\\s*([^\\n]+(?:\\n(?!(?:\\*\\*|##))[^\\n]+)*)`,
      'i'
    );
    const match2 = output.match(pattern2);
    if (match2) {
      return match2[1].trim();
    }

    // Pattern 3: Section with agent role (match common role names)
    const rolePatterns = [
      'backend',
      'frontend',
      'database',
      'api',
      'ui',
      'developer',
      'engineer',
      'designer'
    ];
    
    for (const role of rolePatterns) {
      if (agentId.toLowerCase().includes(role)) {
        const pattern3 = new RegExp(
          `(?:${role}|${agentId})\\s*(?:developer|engineer|designer)?\\s*:?\\s*([^\\n]+(?:\\n(?!\\w+:)[^\\n]+)*)`,
          'i'
        );
        const match3 = output.match(pattern3);
        if (match3) {
          return match3[1].trim();
        }
      }
    }

    return null;
  }
}
