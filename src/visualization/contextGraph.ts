// src/visualization/contextGraph.ts

export type ContextGraphInput = {
  userInput: string;
  outputs: Record<string, string>;
  timeline: Array<{
    agentId: string;
    role: string;
    branchId?: string;
    isAggregator?: boolean;
  }>;
};

export function buildContextGraph(context: ContextGraphInput): string {
  const lines: string[] = [];

  lines.push("CONTEXT INTERACTION FLOW");
  lines.push("=".repeat(60));
  lines.push("");

  // Start with user input
  lines.push("userInput");
  lines.push(`   └─ "${context.userInput}"`);

  if (!context.timeline || context.timeline.length === 0) {
    lines.push("        │");
    lines.push("        └──▶ (no agents executed)");
    return lines.join("\n");
  }

  // Determine if this is a parallel or sequential workflow
  const isParallel = context.timeline.some(e => e.branchId !== undefined);
  
  if (isParallel) {
    // Parallel workflow visualization
    const branches = context.timeline.filter(e => !e.isAggregator);
    const aggregator = context.timeline.find(e => e.isAggregator);
    
    lines.push("        │");
    
    branches.forEach((entry, index) => {
      const isLast = index === branches.length - 1 && !aggregator;
      const prefix = isLast ? "└" : "├";
      
      lines.push(`        ${prefix}──▶ ${entry.agentId} [read context]`);
      lines.push(`              │`);
      lines.push(`              └──▶ outputs.${entry.agentId} [write]`);
      
      if (!isLast || aggregator) {
        lines.push(`              │`);
      }
    });
    
    if (aggregator) {
      lines.push(`        └──▶ ${aggregator.agentId} [read ALL outputs]`);
      lines.push(`              │`);
      lines.push(`              └──▶ outputs.${aggregator.agentId} [write]`);
    }
  } else {
    // Sequential workflow visualization
    lines.push("        │");
    
    context.timeline.forEach((entry, index) => {
      const isFirst = index === 0;
      const isLast = index === context.timeline.length - 1;
      const prefix = isLast ? "└" : "├";
      
      // Determine what the agent reads
      let readContext: string;
      if (isFirst) {
        readContext = "context";
      } else if (index === context.timeline.length - 1 && context.timeline.length > 2) {
        readContext = "ALL outputs";
      } else {
        readContext = "context";
      }
      
      lines.push(`        ${prefix}──▶ ${entry.agentId} [read ${readContext}]`);
      lines.push(`              │`);
      lines.push(`              └──▶ outputs.${entry.agentId} [write]`);
      
      if (!isLast) {
        lines.push(`              │`);
      }
    });
  }

  return lines.join("\n");
}