import { AgentRegistry } from "../agents/registry";
import { ContextStore } from "../context/store";
import { buildPrompt } from "../prompt/builder";
import { LLMProvider } from "../llm/provider";
import { printAgentStart, printAgentComplete } from "../reporter/console";

export async function runSequentialWorkflow(params: {
  steps: { agent: string }[];
  registry: AgentRegistry;
  context: ContextStore;
  llm: LLMProvider;
}) {
  const { steps, registry, context, llm } = params;

  for (const step of steps) {
    const agent = registry.getAgent(step.agent);

    // Print start message
    printAgentStart(agent.id, agent.role);

    const startedAt = Date.now();

    const prompt = buildPrompt(agent, context);

    const output = await llm.generate({
      system: prompt.system,
      user: prompt.user,
      temperature: 0.2,
    });

    const endedAt = Date.now();

    // Store output
    context.outputs[agent.id] = output;

    // Add timeline entry
    const entry = {
      agentId: agent.id,
      role: agent.role,
      output,
      startedAt,
      endedAt,
    };
    context.timeline.push(entry);

    // Print completion message
    printAgentComplete(entry);
  }
}