# Test Configurations

This directory contains test configuration files to verify error handling and tool invocation in SpindleFlow.

## Test Categories

### 1. Error Handling Tests
Configurations that verify comprehensive error detection and reporting.

### 2. Tool Invocation Tests
Configurations that demonstrate basic tool invocation capabilities.

📖 **See [TOOL_INVOCATION_TESTS.md](TOOL_INVOCATION_TESTS.md) for detailed tool invocation documentation.**

---

## Error Handling Test Files

| File | Error Type | Expected Error | Description |
|------|------------|----------------|-------------|
| `1-missing-required-field.yml` | Schema Validation | Missing 'goal' field | Tests detection of missing required agent fields |
| `2-duplicate-agent-id.yml` | Semantic Validation | Duplicate agent IDs | Tests duplicate agent ID detection |
| `3-unknown-agent-reference.yml` | Semantic Validation | Unknown agent in sequential workflow | Tests detection of non-existent agent references |
| `4-invalid-workflow-type.yml` | Schema Validation | Invalid workflow type | Tests workflow type must be 'sequential' or 'parallel' |
| `5-empty-file.yml` | File Loading | Empty file | Tests empty file detection |
| `6-yaml-syntax-error.yml` | YAML Parsing | Invalid YAML syntax | Tests YAML parsing error with indentation issue |
| `7-aggregator-in-branches.yml` | Semantic Validation | Aggregator in branches | Tests parallel workflow aggregator validation |
| `8-wrong-data-type.yml` | Schema Validation | Wrong data type | Tests type validation for workflow steps |
| `9-empty-agent-id.yml` | Schema Validation | Empty string validation | Tests minimum length validation |
| `10-parallel-unknown-agent.yml` | Semantic Validation | Unknown agent in parallel branches | Tests agent reference in parallel workflows |
| `11-missing-workflow.yml` | Schema Validation | Missing required section | Tests missing workflow section |
| `12-empty-branches.yml` | Schema Validation | Empty array validation | Tests minimum array length for branches |

## Tool Invocation Test Files

| File | Type | Description |
|------|------|-------------|
| `tool-sequential.yml` | Sequential + Tools | 4 agents with various tool combinations |
| `tool-parallel.yml` | Parallel + Tools | 3 parallel branches + aggregator with tools |

---

## Running Error Handling Tests

### Individual Tests

```bash
# Test missing required field
npm run dev run configs/tests/1-missing-required-field.yml -- --input "test"

# Test duplicate agent ID
npm run dev run configs/tests/2-duplicate-agent-id.yml -- --input "test"

# Test unknown agent reference
npm run dev run configs/tests/3-unknown-agent-reference.yml -- --input "test"

# Test invalid workflow type
npm run dev run configs/tests/4-invalid-workflow-type.yml -- --input "test"

# Test YAML syntax error
npm run dev run configs/tests/6-yaml-syntax-error.yml -- --input "test"

# Test aggregator in branches
npm run dev run configs/tests/7-aggregator-in-branches.yml -- --input "test"

# ... and so on
```

### Special Cases

**Empty file test** (clear the file first):
```bash
echo "" > configs/tests/5-empty-file.yml
npm run dev run configs/tests/5-empty-file.yml -- --input "test"
```

**File not found test**:
```bash
npm run dev run configs/tests/nonexistent.yml -- --input "test"
```

### Run All Error Tests

```bash
for i in {1..12}; do 
  echo "=== Test $i ===" 
  npm run dev run configs/tests/$i-*.yml -- --input "test" 2>&1 | head -20
  echo
done
```

---

## Running Tool Invocation Tests

### Sequential Workflow with Tools

```bash
npm run dev run configs/tests/tool-sequential.yml -- --input "Design a microservices data platform"
```

**What to observe:**
- 🔧 Tool invocation logs before each agent
- Tool outputs in agent context
- 4 agents: data_collector (python, sql) → code_analyzer (javascript, rust, cpp) → system_integrator (shell, http) → final_reviewer (no tools)

### Parallel Workflow with Tools

```bash
npm run dev run configs/tests/tool-parallel.yml -- --input "Evaluate multi-language microservice architecture"
```

**What to observe:**
- 🔧 Parallel tool invocations in branches
- Tool outputs visible to aggregator
- 3 branches with tools + aggregator with tools

📖 **For complete tool invocation documentation, see [TOOL_INVOCATION_TESTS.md](TOOL_INVOCATION_TESTS.md)**

---

## Expected Error Output Format

All errors display:
- ❌ **Error Type** header
- **Error Message** - What went wrong
- 📋 **Details** - Specific information
- 💡 **Suggestions** - Actionable steps to fix

Example:
```
❌ Configuration Error

Duplicate agent ID found: "researcher"

📋 Details:
Problem with agent: "researcher"

💡 Suggestions:
  1. Each agent must have a unique ID
  2. Check your 'agents' section for duplicate IDs
  3. Found multiple agents with ID: "researcher"
```

---

## Validation Checklist

Before running configs, ensure:
- ✅ All agents have `id`, `role`, and `goal` fields
- ✅ All agent IDs are unique
- ✅ All workflow references point to existing agents (case-sensitive)
- ✅ Workflow type is either `sequential` or `parallel`
- ✅ Sequential workflows have at least one step
- ✅ Parallel workflows have at least one branch and a `then` field
- ✅ YAML syntax is valid (proper indentation, spaces after colons)
- ✅ No tabs used for indentation (use spaces only)
- ✅ Tools (if declared) are valid tool names

---

## Quick Reference

**Valid workflow structure (sequential):**
```yaml
agents:
  - id: agent1
    role: Role Name
    goal: Agent goal
    tools: [python, sql]  # Optional

workflow:
  type: sequential
  steps:
    - agent: agent1
```

**Valid workflow structure (parallel):**
```yaml
agents:
  - id: agent1
    role: Role 1
    goal: Goal 1
  - id: agent2
    role: Role 2
    goal: Goal 2
  - id: aggregator
    role: Aggregator Role
    goal: Combine results

workflow:
  type: parallel
  branches:
    - agent1
    - agent2
  then:
    agent: aggregator
```

---

## Additional Resources

- [ERROR_HANDLING.md](../../ERROR_HANDLING.md) - Complete error handling guide
- [TOOL_INVOCATION.md](../../TOOL_INVOCATION.md) - Tool invocation design document
- [TOOL_INVOCATION_TESTS.md](TOOL_INVOCATION_TESTS.md) - Tool testing guide
