import { loadYamlConfig } from "../config/loader";
import { RootConfigSchema, RootConfig } from "../config/schema";
import { validateSemantics } from "../config/validator";
import { AgentRegistry } from "../agents/registry";
import { getLLMProvider } from "../llm";
import { runWorkflow } from "../orchestrator/engine";
import {
  printWorkflowStart,
  printFinalOutput,
  printError,
} from "../reporter/console";
import { ContextStore } from "../context/store";

export async function runCommand(
  configPath: string,
  userInput: string
) {
  try {
    // 1. Load raw YAML
    const rawConfig = loadYamlConfig(configPath);

    // 2. Parse + validate structure (Zod is the source of truth)
    const parsed: RootConfig = RootConfigSchema.parse(rawConfig);

    // 3. Semantic validation (IDs, references, logic)
    validateSemantics(parsed);

    // 4. Build agent registry
    const registry = new AgentRegistry(parsed);

    // 5. Initialize shared context
    const context: ContextStore = {
      userInput,
      outputs: {},
      timeline: [],
    };

    // 6. Select LLM provider
    const llm = getLLMProvider();

    // 7. Print workflow start
    printWorkflowStart(userInput);

    // 8. Execute workflow
    await runWorkflow({
      config: parsed,
      registry,
      context,
      llm,
    });

    // 9. Print final output
    printFinalOutput(context);

  } catch (error) {
    if (error instanceof Error) {
      printError(error, "Workflow Execution");
    } else {
      printError(new Error(String(error)), "Workflow Execution");
    }
    process.exit(1);
  }
}