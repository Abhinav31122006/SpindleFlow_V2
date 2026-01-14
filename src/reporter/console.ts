import { ContextStore, TimelineEntry } from "../context/store";

// Color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

export function printWorkflowStart(userInput: string) {
  console.log("\n" + "=".repeat(60));
  console.log(`${colors.bright}${colors.cyan}🚀 Starting Workflow Execution${colors.reset}`);
  console.log("=".repeat(60));
  if (userInput) {
    console.log(`${colors.dim}User Input: ${colors.reset}${userInput}`);
  }
  console.log();
}

export function printAgentStart(agentId: string, role: string) {
  console.log(`${colors.yellow}▶${colors.reset} ${colors.bright}${role}${colors.reset} ${colors.gray}(${agentId})${colors.reset}`);
  console.log(`${colors.gray}  Executing...${colors.reset}`);
}

export function printAgentComplete(entry: TimelineEntry) {
  const duration = entry.endedAt - entry.startedAt;
  console.log(`${colors.green}✓${colors.reset} ${colors.bright}${entry.role}${colors.reset} ${colors.gray}completed in ${duration}ms${colors.reset}`);
  console.log();
  console.log(`${colors.dim}Output:${colors.reset}`);
  console.log(formatOutput(entry.output));
  console.log();
}

export function printParallelStart(branches: string[]) {
  console.log(`${colors.magenta}⚡${colors.reset} ${colors.bright}Parallel Execution${colors.reset} ${colors.gray}(${branches.length} branches)${colors.reset}`);
  console.log(`${colors.gray}  Running: ${branches.join(", ")}${colors.reset}`);
  console.log();
}

export function printParallelComplete(count: number, totalTime: number) {
  console.log(`${colors.green}✓${colors.reset} ${colors.bright}Parallel branches completed${colors.reset} ${colors.gray}(${count} agents in ${totalTime}ms)${colors.reset}`);
  console.log();
}

export function printAggregatorStart(agentId: string, role: string) {
  console.log(`${colors.blue}◆${colors.reset} ${colors.bright}Aggregator: ${role}${colors.reset} ${colors.gray}(${agentId})${colors.reset}`);
  console.log(`${colors.gray}  Consolidating results...${colors.reset}`);
}

export function printFinalOutput(context: ContextStore) {
  const last = context.timeline[context.timeline.length - 1];

  console.log("\n" + "=".repeat(60));
  console.log(`${colors.bright}${colors.green}✨ Final Output${colors.reset}`);
  console.log("=".repeat(60));
  console.log();

  if (last) {
    console.log(last.output);
  } else {
    console.log("No output generated.");
  }

  console.log();
  printExecutionSummary(context);
}

export function printExecutionSummary(context: ContextStore) {
  console.log("─".repeat(60));
  console.log(`${colors.bright}Execution Summary${colors.reset}`);
  console.log("─".repeat(60));

  if (context.timeline.length === 0) {
    console.log("No agents executed.");
    return;
  }

  const totalTime = context.timeline[context.timeline.length - 1].endedAt - 
                    context.timeline[0].startedAt;

  console.log(`${colors.dim}Total Agents:${colors.reset} ${context.timeline.length}`);
  console.log(`${colors.dim}Total Time:${colors.reset} ${totalTime}ms`);
  console.log();

  console.log(`${colors.dim}Execution Timeline:${colors.reset}`);
  for (const entry of context.timeline) {
    const duration = entry.endedAt - entry.startedAt;
    console.log(`  ${colors.gray}•${colors.reset} ${entry.role} ${colors.gray}(${duration}ms)${colors.reset}`);
  }

  console.log();
}

export function printError(error: Error, context?: string) {
  console.error(`\n${colors.bright}\x1b[31m❌ Error${colors.reset}`);
  if (context) {
    console.error(`${colors.dim}Context: ${context}${colors.reset}`);
  }
  console.error(`${colors.dim}Message:${colors.reset} ${error.message}`);
  if (error.stack) {
    console.error(`\n${colors.gray}${error.stack}${colors.reset}`);
  }
  console.error();
}

function formatOutput(output: string): string {
  // Indent output for better readability
  return output
    .split("\n")
    .map(line => `  ${line}`)
    .join("\n");
}