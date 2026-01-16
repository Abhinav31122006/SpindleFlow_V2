# Tool Invocation Test Configurations

These test configurations demonstrate the **basic tool invocation** feature in SpindleFlow.

## Overview

Tool invocation allows agents to declare execution capabilities they need. The orchestrator invokes these tools **deterministically** before the agent's LLM reasoning, adding tool outputs to the agent's context.

## Design Principles

1. **Declarative** - Tools are declared in YAML at the agent level
2. **Deterministic** - Tools are invoked in declaration order, every time
3. **Bounded** - Tools are predefined capabilities, not external integrations
4. **Auditable** - Tool usage is logged and visible in execution traces
5. **Orchestrator-Controlled** - Tools never control workflow, only contribute to context

## Available Tools

The following tools are available for agent declaration:

| Tool | Description | Use Case |
|------|-------------|----------|
| `python` | Python-style data processing | Analytics, statistical analysis |
| `javascript` | JavaScript-style computation | Logic processing, computation |
| `sql` | SQL-style querying | Data querying, aggregation |
| `shell` | Shell-style execution | Command processing, system tasks |
| `http` | HTTP-style requests | API interaction, request handling |
| `rust` | Rust-style safe computation | Performance-critical tasks |
| `java` | Java object-oriented processing | Enterprise-style processing |
| `cpp` | C++ high-performance computation | Low-level optimization |

## Test Files

### Sequential Workflow with Tools

**File:** `tool-sequential.yml`

Demonstrates tool invocation in a sequential workflow where:
- Each agent may declare different tools
- Tools are invoked before each agent's reasoning
- Tool outputs accumulate in context
- Final agent (reviewer) has no tools - pure reasoning

**Agents:**
1. **data_collector** - Uses `python` and `sql`
2. **code_analyzer** - Uses `javascript`, `rust`, and `cpp`
3. **system_integrator** - Uses `shell` and `http`
4. **final_reviewer** - No tools (pure reasoning)

**Run:**
```bash
npm run dev run configs/tests/tool-sequential.yml -- --input "Design a microservices data platform"
```

### Parallel Workflow with Tools

**File:** `tool-parallel.yml`

Demonstrates tool invocation in a parallel workflow where:
- Tools are invoked concurrently in each branch
- Each branch can use different tools
- Aggregator can also use tools
- Tool execution is parallel but deterministic within each branch

**Agents:**
1. **python_researcher** (branch) - Uses `python` and `sql`
2. **javascript_developer** (branch) - Uses `javascript`
3. **rust_specialist** (branch) - Uses `rust` and `cpp`
4. **integration_summarizer** (aggregator) - Uses `java` and `http`

**Run:**
```bash
npm run dev run configs/tests/tool-parallel.yml -- --input "Evaluate multi-language microservice architecture"
```

## What Tool Invocation Shows

When you run these tests, observe:

1. **🔧 Tool Invocation Logs** - Shows which tools are being invoked
2. **Tool Output Format** - Structured output from each tool
3. **Context Integration** - Tool outputs appear in the prompt sent to the LLM
4. **Execution Order** - Tools execute in declaration order
5. **Determinism** - Same config + input = same tool invocations

## Expected Output Structure

Tool outputs are formatted and injected into the agent's prompt:

```
User input:
<user's input>

=== TOOL OUTPUTS ===

## Tool: python
[Python Analysis]
- Input tokens analyzed: 45
- Previous outputs processed: 0
- Data processing capability: READY
- Statistical analysis: ENABLED

## Tool: sql
[SQL Query Engine]
- Available data rows: 0
- Query optimizer: ENABLED
- Index status: READY
- Aggregation functions: AVAILABLE

=== END TOOL OUTPUTS ===

Previous agent outputs:
...
```

## Validation

To verify tool invocation is working:

1. **Check logs** - Look for `TOOL_INVOCATION_START` and `TOOL_INVOCATION_COMPLETE` events
2. **Check agent outputs** - Agents should reference tool capabilities in their responses
3. **Check execution flow** - Tools execute before LLM calls
4. **Check determinism** - Run same config twice, observe identical tool invocations

## What This Is NOT

This is **basic tool invocation**, intentionally limited to:
- ✅ Predefined capabilities
- ✅ Deterministic execution
- ✅ Bounded, safe operations
- ✅ Clear auditability

It does NOT include:
- ❌ Dynamic tool selection by LLMs
- ❌ External service integrations
- ❌ Unbounded code execution
- ❌ Plugin ecosystems
- ❌ Real API calls

This design demonstrates orchestration quality while maintaining simplicity and safety.

## Alignment with TOOL_INVOCATION.md

These tests validate all design principles from `TOOL_INVOCATION.md`:
- Tools as capability indicators
- Declarative specification
- Orchestrator-controlled invocation
- Deterministic behavior
- Separation of responsibilities
- Auditability and visibility
