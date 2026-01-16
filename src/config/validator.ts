import { RootConfig } from "./schema";

export function validateSemantics(config: RootConfig) {
  const agentIds = new Set<string>();

  for (const agent of config.agents) {
    if (agentIds.has(agent.id)) {
      throw new Error(`Duplicate agent id: ${agent.id}`);
    }
    agentIds.add(agent.id);
  }

  const assertAgentExists = (id: string) => {
    if (!agentIds.has(id)) {
      throw new Error(`Workflow references unknown agent: ${id}`);
    }
  };

  if (config.workflow.type === "sequential") {
    config.workflow.steps.forEach(step =>
      assertAgentExists(step.agent)
    );
  }

  if (config.workflow.type === "parallel") {
    config.workflow.branches.forEach(assertAgentExists);
    assertAgentExists(config.workflow.then.agent);
  }
}
