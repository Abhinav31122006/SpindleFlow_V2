/**
 * Basic Tool Invocation Layer
 * 
 * Tools are capability indicators that represent execution abilities.
 * They are invoked deterministically before agent reasoning.
 */

export type ToolResult = {
  toolName: string;
  output: string;
  executedAt: number;
  duration: number;
};

export type ToolInvocationContext = {
  userInput: string;
  previousOutputs: Array<{ agentId: string; role: string; output: string }>;
};

/**
 * Base Tool Interface
 * All tools must implement this interface
 */
export interface Tool {
  name: string;
  description: string;
  execute(context: ToolInvocationContext): Promise<string> | string;
}

/**
 * Simulated Python-style data processing tool
 */
class PythonTool implements Tool {
  name = "python";
  description = "Python-style data processing and analysis";

  execute(context: ToolInvocationContext): string {
    const dataPoints = context.previousOutputs.length;
    const inputLength = context.userInput.length;
    
    return `[Python Analysis]
- Input tokens analyzed: ${inputLength}
- Previous outputs processed: ${dataPoints}
- Data processing capability: READY
- Statistical analysis: ENABLED`;
  }
}

/**
 * Simulated JavaScript execution tool
 */
class JavaScriptTool implements Tool {
  name = "javascript";
  description = "JavaScript-style computation and logic";

  execute(context: ToolInvocationContext): string {
    const timestamp = Date.now();
    const hasData = context.previousOutputs.length > 0;
    
    return `[JavaScript Runtime]
- Execution timestamp: ${timestamp}
- Context state: ${hasData ? 'POPULATED' : 'INITIAL'}
- Computation engine: ACTIVE
- Logic processing: READY`;
  }
}

/**
 * Simulated SQL-style querying tool
 */
class SQLTool implements Tool {
  name = "sql";
  description = "SQL-style data querying and aggregation";

  execute(context: ToolInvocationContext): string {
    const rowCount = context.previousOutputs.length;
    
    return `[SQL Query Engine]
- Available data rows: ${rowCount}
- Query optimizer: ENABLED
- Index status: READY
- Aggregation functions: AVAILABLE`;
  }
}

/**
 * Simulated shell execution tool
 */
class ShellTool implements Tool {
  name = "shell";
  description = "Shell-style command execution";

  execute(context: ToolInvocationContext): string {
    return `[Shell Executor]
- Environment: INITIALIZED
- Working directory: /workspace
- Command processor: READY
- Exit code handling: ENABLED`;
  }
}

/**
 * Simulated HTTP request tool
 */
class HTTPTool implements Tool {
  name = "http";
  description = "HTTP-style request handling";

  execute(context: ToolInvocationContext): string {
    return `[HTTP Client]
- Protocol: HTTP/1.1
- Connection pool: READY
- Request builder: INITIALIZED
- Response parser: ACTIVE`;
  }
}

/**
 * Simulated Rust computation tool
 */
class RustTool implements Tool {
  name = "rust";
  description = "Rust-style safe computation";

  execute(context: ToolInvocationContext): string {
    return `[Rust Compiler]
- Memory safety: GUARANTEED
- Zero-cost abstractions: ENABLED
- Ownership checker: ACTIVE
- Performance mode: OPTIMIZED`;
  }
}

/**
 * Simulated Java execution tool
 */
class JavaTool implements Tool {
  name = "java";
  description = "Java-style object-oriented processing";

  execute(context: ToolInvocationContext): string {
    return `[Java Virtual Machine]
- JVM version: 17 LTS
- Garbage collector: G1GC
- Class loader: READY
- Thread pool: INITIALIZED`;
  }
}

/**
 * Simulated C++ computation tool
 */
class CppTool implements Tool {
  name = "cpp";
  description = "C++ high-performance computation";

  execute(context: ToolInvocationContext): string {
    return `[C++ Runtime]
- Compiler: GCC 11.0
- Optimization level: O3
- Standard library: LOADED
- Template engine: ACTIVE`;
  }
}

/**
 * Tool Registry
 * Maintains all available tools
 */
class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerTool(new PythonTool());
    this.registerTool(new JavaScriptTool());
    this.registerTool(new SQLTool());
    this.registerTool(new ShellTool());
    this.registerTool(new HTTPTool());
    this.registerTool(new RustTool());
    this.registerTool(new JavaTool());
    this.registerTool(new CppTool());
  }

  private registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  hasTools(toolNames: string[]): boolean {
    return toolNames.every(name => this.tools.has(name));
  }

  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }
}

/**
 * Tool Invoker
 * Handles deterministic tool invocation
 */
export class ToolInvoker {
  private registry: ToolRegistry;

  constructor() {
    this.registry = new ToolRegistry();
  }

  /**
   * Invoke tools declared by an agent
   * Returns aggregated tool outputs
   */
  async invokeTools(
    toolNames: string[],
    context: ToolInvocationContext
  ): Promise<ToolResult[]> {
    if (!toolNames || toolNames.length === 0) {
      return [];
    }

    const results: ToolResult[] = [];

    // Invoke tools in declaration order (deterministic)
    for (const toolName of toolNames) {
      const tool = this.registry.getTool(toolName);
      
      if (!tool) {
        // Unknown tool - skip silently (could log warning)
        continue;
      }

      const startTime = Date.now();
      const output = await tool.execute(context);
      const endTime = Date.now();

      results.push({
        toolName: tool.name,
        output,
        executedAt: startTime,
        duration: endTime - startTime,
      });
    }

    return results;
  }

  /**
   * Format tool results for inclusion in agent context
   */
  formatToolResults(results: ToolResult[]): string {
    if (results.length === 0) {
      return "";
    }

    const sections = results.map(result => {
      return `## Tool: ${result.toolName}\n${result.output}`;
    });

    return `\n\n=== TOOL OUTPUTS ===\n\n${sections.join("\n\n")}\n\n=== END TOOL OUTPUTS ===\n`;
  }

  /**
   * Get list of available tools
   */
  getAvailableTools(): string[] {
    return this.registry.getAvailableTools();
  }
}
