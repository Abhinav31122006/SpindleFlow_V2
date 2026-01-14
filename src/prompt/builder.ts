import { Agent } from "../agents/agent";
import { ContextStore } from "../context/store";
import { logPromptConstruction, logDataTransfer, promptLogger } from "../logger/enhanced-logger";

export function buildPrompt(
  agent: Agent,
  context: ContextStore
): { system: string; user: string } {
  promptLogger.info({
    event: "PROMPT_BUILD_START",
    agentId: agent.id,
    role: agent.role,
    timestamp: Date.now(),
  }, `🏗️ Building prompt for agent: ${agent.id}`);

  // Log agent data being used
  promptLogger.debug({
    event: "AGENT_DATA_ACCESSED",
    agentId: agent.id,
    role: agent.role,
    goal: agent.goal,
    tools: agent.tools,
  }, `📋 Using agent configuration: ${agent.id}`);

  logDataTransfer(
    "AgentRegistry",
    "PromptBuilder",
    { agentId: agent.id, role: agent.role, goal: agent.goal },
    "explicit"
  );

  // Build system prompt
  promptLogger.debug({
    event: "SYSTEM_PROMPT_CONSTRUCTION",
    agentId: agent.id,
  }, `🔧 Constructing system prompt for: ${agent.id}`);

  const systemPrompt = `
You are acting as: ${agent.role}

Your goal:
${agent.goal}

Follow the goal strictly. Be concise, clear, and relevant.
`.trim();

  promptLogger.debug({
    event: "SYSTEM_PROMPT_COMPLETE",
    agentId: agent.id,
    length: systemPrompt.length,
    systemPrompt,
  }, `✅ System prompt constructed (${systemPrompt.length} chars)`);

  // Build user prompt - start with user input
  promptLogger.debug({
    event: "USER_PROMPT_START",
    agentId: agent.id,
  }, `🔧 Constructing user prompt for: ${agent.id}`);

  const userInputLength = context.userInput.length;
  promptLogger.debug({
    event: "USER_INPUT_ACCESSED",
    agentId: agent.id,
    userInputLength,
    userInput: context.userInput,
  }, `📥 Accessing user input (${userInputLength} chars)`);

  logDataTransfer(
    "ContextStore.userInput",
    "PromptBuilder",
    { userInput: context.userInput },
    "explicit"
  );

  let userPrompt = `User input:\n${context.userInput}\n`;

  // Add previous agent outputs if any exist
  const previousOutputs = context.getPreviousOutputs();
  
  promptLogger.debug({
    event: "PREVIOUS_OUTPUTS_CHECK",
    agentId: agent.id,
    previousOutputCount: previousOutputs.length,
  }, `🔍 Checking for previous outputs: ${previousOutputs.length} found`);

  if (previousOutputs.length > 0) {
    promptLogger.info({
      event: "ADDING_CONTEXT",
      agentId: agent.id,
      previousOutputCount: previousOutputs.length,
    }, `➕ Adding ${previousOutputs.length} previous outputs to context`);

    userPrompt += `\nPrevious agent outputs:\n`;

    logDataTransfer(
      "ContextStore.timeline",
      "PromptBuilder",
      previousOutputs,
      "implicit"
    );

    for (let i = 0; i < previousOutputs.length; i++) {
      const entry = previousOutputs[i];
      
      promptLogger.debug({
        event: "OUTPUT_ADDED_TO_PROMPT",
        agentId: agent.id,
        sourceAgentId: entry.agentId,
        sourceRole: entry.role,
        outputLength: entry.output.length,
        position: i + 1,
        total: previousOutputs.length,
      }, `  📝 Adding output ${i + 1}/${previousOutputs.length} from ${entry.role}`);

      userPrompt += `
--- ${entry.role} (${entry.agentId}) ---
${entry.output}
`;

      logDataTransfer(
        entry.agentId,
        `PromptBuilder->${agent.id}`,
        { output: entry.output },
        "implicit"
      );
    }
  } else {
    promptLogger.debug({
      event: "NO_CONTEXT_ADDED",
      agentId: agent.id,
    }, `ℹ️ No previous outputs to add`);
  }

  userPrompt = userPrompt.trim();

  promptLogger.debug({
    event: "USER_PROMPT_COMPLETE",
    agentId: agent.id,
    length: userPrompt.length,
    userPrompt,
  }, `✅ User prompt constructed (${userPrompt.length} chars)`);

  const result = {
    system: systemPrompt,
    user: userPrompt,
  };

  // Log the complete constructed prompt
  logPromptConstruction(
    agent.id,
    systemPrompt,
    userPrompt,
    {
      userInputUsed: true,
      previousOutputsUsed: previousOutputs.length > 0,
      previousOutputCount: previousOutputs.length,
    }
  );

  promptLogger.info({
    event: "PROMPT_BUILD_COMPLETE",
    agentId: agent.id,
    systemLength: systemPrompt.length,
    userLength: userPrompt.length,
    totalLength: systemPrompt.length + userPrompt.length,
  }, `🎉 Prompt build complete for ${agent.id} (total: ${systemPrompt.length + userPrompt.length} chars)`);

  return result;
}