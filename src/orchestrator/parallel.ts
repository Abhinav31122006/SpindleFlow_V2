import { AgentRegistry } from "../agents/registry";
import { ContextStore } from "../context/store";
import { buildPrompt } from "../prompt/builder";
import { LLMProvider } from "../llm/provider";
import {
  printParallelStart,
  printParallelComplete,
  printAggregatorStart,
  printAgentComplete,
} from "../reporter/console";

export async function runParallelWorkflow(params: {
  branches: string[];
  then: { agent: string };
  registry: AgentRegistry;
  context: ContextStore;
  llm: LLMProvider;
}) {
  const { branches, then, registry, context, llm } = params;

  // Print parallel execution start
  printParallelStart(branches);

  const parallelStartTime = Date.now();

  // Run branch agents in parallel
  const branchResults = await Promise.all(
    branches.map(async (agentId) => {
      const agent = registry.getAgent(agentId);
      const startedAt = Date.now();

      const prompt = buildPrompt(agent, context);

      const output = await llm.generate({
        system: prompt.system,
        user: prompt.user,
        temperature: 0.2,
      });

      const endedAt = Date.now();

      return {
        agentId: agent.id,
        role: agent.role,
        output,
        startedAt,
        endedAt,
      };
    })
  );

  const parallelEndTime = Date.now();
  const parallelDuration = parallelEndTime - parallelStartTime;

  // Merge branch outputs into context
  for (const result of branchResults) {
    context.outputs[result.agentId] = result.output;
    context.timeline.push(result);
  }

  // Print parallel completion
  printParallelComplete(branchResults.length, parallelDuration);

  // Print individual branch outputs
  for (const result of branchResults) {
    printAgentComplete(result);
  }

  // Run the final "then" agent (aggregator)
  const finalAgent = registry.getAgent(then.agent);
  printAggregatorStart(finalAgent.id, finalAgent.role);

  const startedAt = Date.now();

  const finalPrompt = buildPrompt(finalAgent, context);

  const finalOutput = await llm.generate({
    system: finalPrompt.system,
    user: finalPrompt.user,
    temperature: 0.2,
  });

  const endedAt = Date.now();

  context.outputs[finalAgent.id] = finalOutput;
  
  const finalEntry = {
    agentId: finalAgent.id,
    role: finalAgent.role,
    output: finalOutput,
    startedAt,
    endedAt,
  };
  
  context.timeline.push(finalEntry);

  // Print aggregator completion
  printAgentComplete(finalEntry);
}