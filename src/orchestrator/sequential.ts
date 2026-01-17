import { AgentRegistry } from "../agents/registry";
import { ContextStore } from "../context/store";
import { buildPrompt } from "../prompt/builder";
import { LLMProvider } from "../llm/provider";
import { ToolInvoker } from "../tools/invoker";
import { ContextSummarizer } from "../context/summarizer";
import { MCPToolRegistry } from "../mcp/registry";
import { ToolAwareLLMProvider } from "../llm/tool-aware-provider";
import { printAgentStart, printAgentComplete } from "../reporter/console";
import {
  logAgentExecution,
  logDataTransfer,
  orchestratorLogger,
} from "../logger/enhanced-logger";
import { SubAgentExecutor } from "../agents/sub-agent-executor";
import { PersistentMemoryManager, createEmbedding } from "../memory/persistent-memory";
import { v4 as uuidv4 } from 'uuid';
import { terminalUI } from "../visualization/terminal-ui";
import { getDashboardServer } from "../server/dashboard-server";

export async function runSequentialWorkflow(params: {
  steps: { agent: string }[];
  registry: AgentRegistry;
  context: ContextStore;
  llm: LLMProvider;
  mcpRegistry?: MCPToolRegistry;
  memoryManager?: PersistentMemoryManager;
  workflowId?: string;
}) {
  const { steps, registry, context, llm, mcpRegistry, memoryManager, workflowId } = params;

  // Initialize context summarizer
  const contextSummarizer = new ContextSummarizer(llm);
  
  // Initialize sub-agent executor
  const subAgentExecutor = new SubAgentExecutor(llm, mcpRegistry, memoryManager);

  const workflowStartTime = Date.now();

  // Start workflow UI
  terminalUI.startWorkflow('sequential', steps.length);

  // Send event to dashboard
  const dashboard = getDashboardServer();
  dashboard.sendEvent({
    type: 'workflow_start',
    timestamp: Date.now(),
    data: { type: 'sequential', totalSteps: steps.length }
  });

  orchestratorLogger.info({
    event: "SEQUENTIAL_WORKFLOW_START",
    totalSteps: steps.length,
    steps: steps.map(s => s.agent),
    timestamp: Date.now(),
  }, `🚀 Starting sequential workflow with ${steps.length} steps`);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepNumber = i + 1;

    orchestratorLogger.info({
      event: "STEP_START",
      stepNumber,
      totalSteps: steps.length,
      agentId: step.agent,
      timestamp: Date.now(),
    }, `📍 Step ${stepNumber}/${steps.length}: ${step.agent}`);

    // Retrieve agent from registry
    orchestratorLogger.debug({
      event: "AGENT_LOOKUP",
      stepNumber,
      agentId: step.agent,
    }, `🔍 Looking up agent: ${step.agent}`);

    const agent = registry.getAgent(step.agent);

    logDataTransfer(
      "AgentRegistry",
      "SequentialOrchestrator",
      { agentId: agent.id, role: agent.role },
      "explicit"
    );

    orchestratorLogger.debug({
      event: "AGENT_FOUND",
      stepNumber,
      agentId: agent.id,
      role: agent.role,
      goal: agent.goal,
    }, `✅ Agent found: ${agent.role}`);

    // Start agent UI
    terminalUI.startAgent(agent.id, agent.role, stepNumber, steps.length);

    // Send to dashboard
    dashboard.sendEvent({
      type: 'agent_start',
      timestamp: Date.now(),
      data: { agentId: agent.id, role: agent.role, stepNumber, totalSteps: steps.length }
    });

    // Print start message
    printAgentStart(agent.id, agent.role);
    logAgentExecution(agent.id, agent.role, "START", {
      stepNumber,
      totalSteps: steps.length,
    });

    const startedAt = Date.now();
    terminalUI.updateAgentProgress(agent.id, 'PROCESSING', 'Preparing agent execution');

    orchestratorLogger.debug({
      event: "AGENT_EXECUTION_START",
      stepNumber,
      agentId: agent.id,
      timestamp: startedAt,
    }, `⚙️ Executing agent: ${agent.id}`);

    // Invoke tools if declared
    let toolOutputs = "";
    if (agent.tools && agent.tools.length > 0) {
      orchestratorLogger.info({
        event: "TOOL_INVOCATION_START",
        stepNumber,
        agentId: agent.id,
        tools: agent.tools,
      }, `🔧 Invoking ${agent.tools.length} tools: ${agent.tools.join(", ")}`);

      const toolInvoker = new ToolInvoker();
      const toolResults = await toolInvoker.invokeTools(agent.tools, {
        userInput: context.userInput,
        previousOutputs: context.getPreviousOutputs(),
      });

      toolOutputs = toolInvoker.formatToolResults(toolResults);

      orchestratorLogger.info({
        event: "TOOL_INVOCATION_COMPLETE",
        stepNumber,
        agentId: agent.id,
        toolCount: toolResults.length,
        totalDuration: toolResults.reduce((sum, r) => sum + r.duration, 0),
      }, `✅ Tools invoked: ${toolResults.length} tools executed`);

      logDataTransfer(
        "ToolInvoker",
        `Agent:${agent.id}`,
        { toolResults },
        "explicit"
      );
    }

    // Build prompt
    orchestratorLogger.debug({
      event: "PROMPT_BUILD_TRIGGER",
      stepNumber,
      agentId: agent.id,
    }, `📝 Triggering prompt build for: ${agent.id}`);

    const contextSnapshot = context.getContext();
    logDataTransfer(
      "ContextStore",
      `Agent:${agent.id}`,
      contextSnapshot,
      "implicit"
    );

    // NEW: Query persistent memory for relevant context
    let relevantMemories: import("../memory/persistent-memory").RelevantMemory[] = [];
    if (agent.enable_persistent_memory && memoryManager?.isInitialized()) {
      try {
        terminalUI.updateAgentProgress(agent.id, 'QUERYING', 'Searching persistent memory');
        const queryText = `${agent.role}: ${agent.goal}`;
        orchestratorLogger.info({
          event: "QUERYING_PERSISTENT_MEMORY",
          stepNumber,
          agentId: agent.id,
          queryText: queryText.substring(0, 100),
        }, `🔍 Querying persistent memory for: ${agent.id}`);

        relevantMemories = await memoryManager.queryMemoriesWithText(queryText, 5);

        terminalUI.showMemoryQuery(agent.id, relevantMemories.length, relevantMemories[0]?.score);

        dashboard.sendEvent({
          type: 'memory_query',
          timestamp: Date.now(),
          data: { agentId: agent.id, count: relevantMemories.length, topScore: relevantMemories[0]?.score || 0 }
        });

        if (relevantMemories.length > 0) {
          orchestratorLogger.info({
            event: "PERSISTENT_MEMORIES_FOUND",
            stepNumber,
            agentId: agent.id,
            memoryCount: relevantMemories.length,
            topScore: relevantMemories[0]?.score || 0,
          }, `✅ Found ${relevantMemories.length} relevant memories (top score: ${(relevantMemories[0]?.score || 0).toFixed(3)})`);
        }
      } catch (error) {
        terminalUI.showMemoryQuery(agent.id, 0);
        orchestratorLogger.warn({
          event: "PERSISTENT_MEMORY_QUERY_ERROR",
          stepNumber,
          agentId: agent.id,
          error: error instanceof Error ? error.message : String(error),
        }, `⚠️ Failed to query persistent memory`);
      }
    }

    const prompt = buildPrompt(agent, context, toolOutputs, relevantMemories);

    logDataTransfer(
      "PromptBuilder",
      `Agent:${agent.id}`,
      { system: prompt.system, user: prompt.user },
      "explicit"
    );

    orchestratorLogger.debug({
      event: "PROMPT_BUILD_COMPLETE",
      stepNumber,
      agentId: agent.id,
      systemLength: prompt.system.length,
      userLength: prompt.user.length,
    }, `✅ Prompt built for: ${agent.id}`);

    // Check if agent has sub-agents
    let output: string;
    let toolCallLog: any[] = [];

    if (agent.sub_agents && agent.sub_agents.length > 0) {
      console.log(`  🔍 Planning sub-agent delegation...`);

      // 1. Plan which sub-agents to use
      const plan = await subAgentExecutor.planSubAgentExecution(
        agent,
        context.userInput,
        context
      );

      console.log(`  📋 Plan: ${plan.reason}`);
      console.log(`  👥 Sub-agents: ${plan.subAgentsToCall.join(', ')}`);
      console.log(`  ⚙️  Mode: ${plan.sequence}`);
      console.log();

      // 2. Execute sub-agents
      const subOutputs = await subAgentExecutor.executeSubAgents(
        agent,
        plan,
        context.userInput,
        context
      );

      console.log(`  🔄 Synthesizing results...`);

      // 3. Parent synthesizes results
      output = await subAgentExecutor.synthesizeResults(
        agent,
        subOutputs,
        context.userInput,
        context
      );

      orchestratorLogger.info({
        event: "SUB_AGENT_WORKFLOW_COMPLETE",
        stepNumber,
        agentId: agent.id,
        subAgentCount: subOutputs.size,
      }, `✅ Sub-agent workflow complete for: ${agent.id}`);

    } else {
      // Normal agent without sub-agents - proceed with standard execution

    // Call LLM
    terminalUI.updateAgentProgress(agent.id, 'LLM_CALL', 'Calling language model');
    logAgentExecution(agent.id, agent.role, "PROCESSING", {
      stepNumber,
      promptLengths: {
        system: prompt.system.length,
        user: prompt.user.length,
      },
    });

    orchestratorLogger.info({
      event: "LLM_CALL_TRIGGER",
      stepNumber,
      agentId: agent.id,
      llmProvider: llm.name,
    }, `🤖 Calling LLM for: ${agent.id}`);

    // Check if agent has MCP tools assigned
    const agentMCPTools = agent.mcpTools || [];
    
    if (agentMCPTools.length > 0 && mcpRegistry) {
      // Use ToolAwareLLMProvider for agents with MCP tools
      orchestratorLogger.info({
        event: "TOOL_AWARE_MODE_ENABLED",
        stepNumber,
        agentId: agent.id,
        mcpTools: agentMCPTools,
      }, `🔧 Tool-aware mode enabled with ${agentMCPTools.length} MCP tools`);

      const toolSchemas = agentMCPTools
        .map((toolName: string) => {
          const toolProvider = mcpRegistry.getTool(toolName);
          return toolProvider ? toolProvider.getSchema() : null;
        })
        .filter((schema: any): schema is import("../mcp/schema").MCPTool => schema !== null);

      orchestratorLogger.debug({
        event: "TOOL_SCHEMAS_LOADED",
        stepNumber,
        agentId: agent.id,
        toolCount: toolSchemas.length,
      }, `✅ Loaded ${toolSchemas.length} tool schemas`);

      const toolAwareLLM = new ToolAwareLLMProvider(llm, mcpRegistry);
      
      const result = await toolAwareLLM.generateWithTools({
        system: prompt.system,
        user: prompt.user,
        temperature: 0.2,
        tools: toolSchemas,
        maxToolCalls: 10,
      });

      output = result.output;
      toolCallLog = result.toolCalls;

      orchestratorLogger.info({
        event: "TOOL_CALLS_EXECUTED",
        stepNumber,
        agentId: agent.id,
        toolCallCount: toolCallLog.length,
        tools: toolCallLog.map(tc => tc.toolName),
      }, `✅ Executed ${toolCallLog.length} tool calls`);
    } else {
      // Use standard LLM provider for agents without MCP tools
      output = await llm.generate({
        system: prompt.system,
        user: prompt.user,
        temperature: 0.2,
      });
    }
    
    } // End of else block for non-sub-agent workflow

    const endedAt = Date.now();
    const duration = endedAt - startedAt;

    orchestratorLogger.info({
      event: "AGENT_EXECUTION_COMPLETE",
      stepNumber,
      agentId: agent.id,
      duration,
      outputLength: output.length,
      timestamp: endedAt,
    }, `✅ Agent completed: ${agent.id} (${duration}ms)`);

    logDataTransfer(
      `LLM:${llm.name}`,
      `Agent:${agent.id}`,
      { output },
      "explicit"
    );

    // Store output in context
    orchestratorLogger.debug({
      event: "STORE_OUTPUT",
      stepNumber,
      agentId: agent.id,
      outputLength: output.length,
    }, `💾 Storing output for: ${agent.id}`);

    context.setOutput(agent.id, output);

    logDataTransfer(
      `Agent:${agent.id}`,
      "ContextStore",
      { output },
      "explicit"
    );

    // Add timeline entry
    orchestratorLogger.debug({
      event: "ADD_TIMELINE",
      stepNumber,
      agentId: agent.id,
    }, `⏱️ Adding timeline entry for: ${agent.id}`);

    const entry = {
      agentId: agent.id,
      role: agent.role,
      output,
      startedAt,
      endedAt,
    };

    context.addTimelineEntry(entry);

    logAgentExecution(agent.id, agent.role, "COMPLETE", {
      stepNumber,
      duration,
      outputLength: output.length,
    });

    // NEW: Create and store summary
    orchestratorLogger.info({
      event: "CREATING_SUMMARY",
      stepNumber,
      agentId: agent.id,
    }, `📝 Creating summary for: ${agent.id}`);

    try {
      const summary = await contextSummarizer.summarize(
        output,
        agent.id,
        agent.role
      );

      context.setSummary(agent.id, summary);

      orchestratorLogger.info({
        event: "SUMMARY_STORED",
        stepNumber,
        agentId: agent.id,
        keyInsightsCount: summary.keyInsights.length,
        decisionsCount: summary.decisions.length,
      }, `✅ Summary created and stored for: ${agent.id}`);

      logDataTransfer(
        "ContextSummarizer",
        "ContextStore",
        { summary },
        "explicit"
      );

      // Store in persistent memory if enabled
      if (agent.enable_persistent_memory && memoryManager?.isInitialized()) {
        try {
          terminalUI.updateAgentProgress(agent.id, 'STORING', 'Saving to persistent memory');
          orchestratorLogger.info({
            event: "STORING_PERSISTENT_MEMORY",
            stepNumber,
            agentId: agent.id,
          }, `🧠 Storing to persistent memory: ${agent.id}`);

          const memoryText = `${agent.role}: ${summary.keyInsights.join('. ')}. ${summary.decisions.join('. ')}`;
          const provider = memoryManager.getEmbeddingProvider();
          const embedding = await createEmbedding(memoryText, provider);

          await memoryManager.storeMemory(
            {
              id: uuidv4(),
              agentId: agent.id,
              role: agent.role,
              content: output,
              keyInsights: summary.keyInsights,
              decisions: summary.decisions,
              artifacts: summary.artifacts,
              timestamp: Date.now(),
              workflowId: workflowId || 'default',
              metadata: {
                stepNumber,
                duration,
              },
            },
            embedding
          );

          terminalUI.showMemoryStore(agent.id, true);

          dashboard.sendEvent({
            type: 'memory_store',
            timestamp: Date.now(),
            data: { agentId: agent.id, success: true }
          });
          orchestratorLogger.info({
            event: "PERSISTENT_MEMORY_STORED",
            stepNumber,
            agentId: agent.id,
          }, `✅ Persistent memory stored for: ${agent.id}`);
        } catch (error) {
          terminalUI.showMemoryStore(agent.id, false);
          orchestratorLogger.error({
            event: "PERSISTENT_MEMORY_ERROR",
            stepNumber,
            agentId: agent.id,
            error: error instanceof Error ? error.message : String(error),
          }, `❌ Failed to store persistent memory for: ${agent.id}`);
        }
      }
    } catch (error) {
      terminalUI.showError(agent.id, error instanceof Error ? error.message : String(error));
      orchestratorLogger.error({
        event: "SUMMARY_CREATION_ERROR",
        stepNumber,
        agentId: agent.id,
        error: error instanceof Error ? error.message : String(error),
      }, `❌ Failed to create summary for: ${agent.id}`);
    }

    // Print completion message
    printAgentComplete(entry);

    // Complete agent UI
    terminalUI.completeAgent(agent.id, duration, output.length);

    // Send to dashboard
    dashboard.sendEvent({
      type: 'agent_complete',
      timestamp: Date.now(),
      data: { agentId: agent.id, duration, outputLength: output.length }
    });

    orchestratorLogger.info({
      event: "STEP_COMPLETE",
      stepNumber,
      totalSteps: steps.length,
      agentId: agent.id,
      duration,
      remainingSteps: steps.length - stepNumber,
    }, `✅ Step ${stepNumber}/${steps.length} complete (${steps.length - stepNumber} remaining)`);
  }

  const workflowDuration = Date.now() - workflowStartTime;

  // Complete workflow UI
  terminalUI.completeWorkflow(workflowDuration, steps.length);

  // Send to dashboard
  dashboard.sendEvent({
    type: 'workflow_end',
    timestamp: Date.now(),
    data: { duration: workflowDuration, agentCount: steps.length }
  });

  orchestratorLogger.info({
    event: "SEQUENTIAL_WORKFLOW_COMPLETE",
    totalSteps: steps.length,
    timestamp: Date.now(),
  }, `🎉 Sequential workflow complete (${steps.length} steps executed)`);
}